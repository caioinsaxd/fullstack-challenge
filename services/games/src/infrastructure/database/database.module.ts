import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { RoundRepository } from "./round.repository";
import { BetRepository } from "./bet.repository";

@Global()
@Module({
  providers: [
    PrismaService,
    RoundRepository,
    BetRepository,
  ],
  exports: [PrismaService, RoundRepository, BetRepository],
})
export class DatabaseModule {}