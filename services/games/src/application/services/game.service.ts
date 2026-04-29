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
    const round = await this.roundRepository.findCurrentRound();
    
    if (!round) {
      throw new Error("No active round available. Try again shortly.");
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

    const calculatedCrashPoint = parseFloat(
      this.provablyFairService.calculateCrashPoint(round.hash).toFixed(2),
    );

    const storedCrashPoint = parseFloat(String(round.crashPoint || "0"));
    const verified = storedCrashPoint === calculatedCrashPoint;

    return {
      seed: round.seed,
      hash: round.hash,
      crashPoint: calculatedCrashPoint,
      verified,
      houseEdge: this.provablyFairService.getHouseEdge(),
    };
  }

  async getPlayerBets(playerId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    return this.betRepository.findByPlayerId(playerId, limit, offset);
  }
}