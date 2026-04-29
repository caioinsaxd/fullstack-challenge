import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { RabbitMQPublisher } from "../../infrastructure/messaging/rabbitmq.publisher";

export interface CashoutInput {
  playerId: string;
  roundId: string;
}

export interface CashoutOutput {
  betId: string;
  amount: number;
  cashoutMultiplier: string;
  profit: number;
}

@Injectable()
export class CashoutUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  async execute(input: CashoutInput): Promise<CashoutOutput> {
    const round = await this.roundRepository.findById(input.roundId);
    
    if (!round) {
      throw new Error("Round not found");
    }

    if (round.status !== "RUNNING") {
      throw new Error("Round is not running");
    }

    const bet = await this.betRepository.findByPlayerAndRound(
      input.playerId,
      input.roundId,
    );

    if (!bet) {
      throw new Error("No bet found for this player");
    }

    if (bet.status === "CASHED_OUT") {
      throw new Error("Already cashed out");
    }

    if (bet.status === "LOST") {
      throw new Error("Bet already lost");
    }

    // Get current multiplier from the running round
    const roundStartTime = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - roundStartTime) / 1000;
    const currentMultiplier = 1 + elapsedSeconds * 0.1; // Same formula as frontend
    
    const betAmount = Number(bet.amount);
    const profit = Math.floor(betAmount * (currentMultiplier - 1));
    const totalReturn = betAmount + profit;

    await this.betRepository.cashout(
      bet.id,
      currentMultiplier.toFixed(2),
      new Date(),
    );

    await this.publisher.publishBetCashedOut({
      type: "bet.cashed_out",
      payload: {
        playerId: input.playerId,
        roundId: input.roundId,
        betId: bet.id,
        amount: totalReturn,
        multiplier: currentMultiplier.toFixed(2),
      },
      timestamp: new Date(),
    });

    return {
      betId: bet.id,
      amount: totalReturn,
      cashoutMultiplier: currentMultiplier.toFixed(2),
      profit,
    };
  }
}