import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { RabbitMQPublisher } from "../../infrastructure/messaging/rabbitmq.publisher";

export interface SettleRoundInput {
  roundId: string;
}

export interface SettleRoundOutput {
  roundId: string;
  crashPoint: string;
  totalBets: number;
  winners: number;
  losers: number;
}

@Injectable()
export class SettleRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  async execute(input: SettleRoundInput): Promise<SettleRoundOutput> {
    const round = await this.roundRepository.findById(input.roundId);
    
    if (!round) {
      throw new Error("Round not found");
    }

    if (round.status !== "RUNNING" && round.status !== "ENDED") {
      throw new Error("Round is not running");
    }

    await this.roundRepository.settle(input.roundId, new Date());

    const bets = await this.betRepository.findByRoundId(input.roundId);
    
    const winners = bets.filter(b => b.status === "CASHED_OUT");
    const losers = bets.filter(b => b.status === "PENDING");

    for (const loser of losers) {
      await this.betRepository.updateStatus(loser.id, "LOST");
    }

    const winnersData = winners.map((w) => ({
      playerId: w.playerId,
      amount: Number(w.amount) + Math.floor(Number(w.amount) * (Number(w.cashoutMultiplier ?? 0) - 1)),
    }));

    const losersData = losers.map((l) => ({
      playerId: l.playerId,
      amount: Number(l.amount),
    }));

    await this.publisher.publishRoundSettled({
      type: "round.settled",
      payload: {
        roundId: input.roundId,
        crashPoint: round.crashPoint?.toString() ?? "0",
        winners: winnersData,
        losers: losersData,
      },
      timestamp: new Date(),
    });

    return {
      roundId: input.roundId,
      crashPoint: round.crashPoint?.toString() ?? "0",
      totalBets: bets.length,
      winners: winners.length,
      losers: losers.length,
    };
  }
}