import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";

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

    if (bet.status === "WON") {
      throw new Error("Already cashed out");
    }

    const crashPoint = Number(round.crashPoint);
    const betAmount = Number(bet.amount);
    const currentMultiplier = crashPoint;
    
    const profit = Math.floor(betAmount * (currentMultiplier - 1));
    const totalReturn = betAmount + profit;

    await this.betRepository.cashout(
      bet.id,
      currentMultiplier.toFixed(2),
      new Date(),
    );

    return {
      betId: bet.id,
      amount: totalReturn,
      cashoutMultiplier: currentMultiplier.toFixed(2),
      profit,
    };
  }
}