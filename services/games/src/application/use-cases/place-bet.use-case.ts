import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { RabbitMQPublisher } from "../../infrastructure/messaging/rabbitmq.publisher";

export interface PlaceBetInput {
  playerId: string;
  amount: number;
}

export interface PlaceBetOutput {
  betId: string;
  roundId: string;
  amount: number;
  status: string;
}

@Injectable()
export class PlaceBetUseCase {
constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  private async checkWalletBalance(playerId: string): Promise<number> {
    const WALLET_URL = process.env.WALLET_SERVICE_URL || "http://localhost:4002";
    const url = `${WALLET_URL}/me?playerId=${playerId}`;
    console.log(`[PlaceBet] Checking balance at: ${url}`);
    try {
      const response = await fetch(url);
      console.log(`[PlaceBet] Wallet response status: ${response.status}`);
      if (!response.ok) {
        return 0;
      }
      const data = await response.json();
      console.log(`[PlaceBet] Wallet data: ${JSON.stringify(data)}`);
      return Number(data.balance) || 0;
    } catch (e) {
      console.log(`[PlaceBet] Wallet error: ${e.message}`);
      return 0;
    }
  }

  private readonly MIN_BET = 100;
  private readonly MAX_BET = 100000;

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findCurrentRound();
    
    if (!round || round.status !== "BETTING") {
      throw new Error("Round is not accepting bets");
    }

    if (input.amount < this.MIN_BET) {
      throw new Error(`Minimum bet is ${this.MIN_BET} cents`);
    }

    if (input.amount > this.MAX_BET) {
      throw new Error(`Maximum bet is ${this.MAX_BET} cents`);
    }

    const balance = await this.checkWalletBalance(input.playerId);
    if (balance < input.amount) {
      throw new Error(`Insufficient balance: you have $${(Number(balance) / 100).toFixed(2)}, need $${(Number(input.amount) / 100).toFixed(2)}`);
    }

    const existingBet = await this.betRepository.findByPlayerAndRound(
      input.playerId,
      round.id,
    );

    if (existingBet) {
      throw new Error("Player already has a bet in this round");
    }

    const bet = await this.betRepository.create({
      roundId: round.id,
      playerId: input.playerId,
      amount: input.amount,
    });

    await this.publisher.publishBetPlaced({
      type: "bet.placed",
      payload: {
        playerId: input.playerId,
        roundId: round.id,
        betId: bet.id,
        amount: input.amount,
      },
      timestamp: new Date(),
    });

    return {
      betId: bet.id,
      roundId: bet.roundId,
      amount: Number(bet.amount),
      status: bet.status,
    };
  }
}