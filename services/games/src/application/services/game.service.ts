import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";

@Injectable()
export class GameService {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async getOrCreateRound() {
    let round = await this.roundRepository.findCurrentRound();
    
    if (!round) {
      const pfResult = this.provablyFairService.generate("new-round");
      
      round = await this.roundRepository.create({
        hash: pfResult.hash,
        seed: pfResult.seed,
      });
    }

    return round;
  }

  async getRoundHistory(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    return this.roundRepository.findAll(limit, offset);
  }

  async verifyRound(roundId: string) {
    const round = await this.roundRepository.findById(roundId);
    
    if (!round) {
      throw new Error("Round not found");
    }

    if (!round.seed || !round.hash) {
      throw new Error("Round verification data not available");
    }

    return this.provablyFairService.verify(round.seed, roundId);
  }
}