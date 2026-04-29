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

  private async checkWalletBalance(playerId: string): Promise<number> {
    const WALLET_URL = process.env.WALLET_SERVICE_URL || "http://localhost:4002";
    try {
      const response = await fetch(`${WALLET_URL}/wallets/me?playerId=${playerId}`);
      if (!response.ok) {
        return 0;
      }
      const data = await response.json();
      return Number(data.balance) || 0;
    } catch {
      return 0;
    }
  }

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

    if (bet.status === "FAILED") {
      throw new Error("Bet failed due to insufficient balance");
    }

    if (bet.status === "LOST") {
      throw new Error("Bet already lost");
    }

    const balance = await this.checkWalletBalance(input.playerId);
    if (balance >= Number(bet.amount)) {
      throw new Error("Bet was not deducted - insufficient balance at round start");
    }

    const roundStartTime = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - roundStartTime) / 1000;
    const currentMultiplier = 1 + elapsedSeconds * 0.1;
    
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