import { Injectable } from "@nestjs/common";
import { BetRepository } from "../../infrastructure/database/bet.repository";

interface CancelBetInput {
  playerId: string;
  roundId: string;
}

@Injectable()
export class CancelBetUseCase {
  constructor(private readonly betRepository: BetRepository) {}

  async execute(input: CancelBetInput) {
    const { playerId, roundId } = input;

    const bet = await this.betRepository.findByPlayerAndRound(playerId, roundId);
    if (!bet) {
      throw new Error("Bet not found");
    }

    if (bet.status !== "PENDING") {
      throw new Error("Cannot cancel bet that is not pending");
    }

    await this.betRepository.delete(bet.id);

    return { success: true, betId: bet.id };
  }
}