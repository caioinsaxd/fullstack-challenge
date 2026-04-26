import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";

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
  ) {}

  async execute(input: SettleRoundInput): Promise<SettleRoundOutput> {
    const round = await this.roundRepository.findById(input.roundId);
    
    if (!round) {
      throw new Error("Round not found");
    }

    if (round.status !== "RUNNING") {
      throw new Error("Round is not running");
    }

    await this.roundRepository.crash(input.roundId, new Date());

    await this.roundRepository.settle(input.roundId, new Date());

    const bets = await this.betRepository.findByRoundId(input.roundId);
    
    const winners = bets.filter(b => b.status === "WON");
    const losers = bets.filter(b => b.status === "PENDING");

    for (const loser of losers) {
      await this.betRepository.updateStatus(loser.id, "LOST");
    }

    return {
      roundId: input.roundId,
      crashPoint: round.crashPoint?.toString() ?? "0",
      totalBets: bets.length,
      winners: winners.length,
      losers: losers.length,
    };
  }
}