import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { ProvablyFairService, ProvablyFairResult } from "../../domain/services/provably-fair.service";

@Injectable()
export class StartRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async execute(roundId: string): Promise<{
    roundId: string;
    crashPoint: string;
  }> {
    const round = await this.roundRepository.findById(roundId);
    
    if (!round) {
      throw new Error("Round not found");
    }

    if (round.status !== "BETTING") {
      throw new Error("Round is not in betting phase");
    }

    const pfResult: ProvablyFairResult = this.provablyFairService.generate(roundId);

    await this.roundRepository.start(
      roundId,
      pfResult.crashPoint,
      new Date(),
    );

    await this.roundRepository.setVerificationData(
      roundId,
      pfResult.hash,
      pfResult.seed,
    );

    return {
      roundId,
      crashPoint: pfResult.crashPoint,
    };
  }
}