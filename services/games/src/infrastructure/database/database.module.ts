import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { RoundRepository } from "./round.repository";
import { BetRepository } from "./bet.repository";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";

@Global()
@Module({
  providers: [
    PrismaService,
    RoundRepository,
    BetRepository,
    ProvablyFairService,
  ],
  exports: [PrismaService, RoundRepository, BetRepository, ProvablyFairService],
})
export class DatabaseModule {}