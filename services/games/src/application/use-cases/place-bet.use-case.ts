import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";

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
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findCurrentRound();
    
    if (!round || round.status !== "BETTING") {
      throw new Error("Round is not accepting bets");
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

    return {
      betId: bet.id,
      roundId: bet.roundId,
      amount: Number(bet.amount),
      status: bet.status,
    };
  }
}