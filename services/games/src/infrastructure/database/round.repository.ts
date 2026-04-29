import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Injectable()
export class RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.round.findUnique({
      where: { id },
      include: { bets: true },
    });
  }

  async findCurrentRound() {
    return this.prisma.round.findFirst({
      where: { status: { in: ["BETTING", "RUNNING"] } },
      orderBy: { createdAt: "desc" },
      include: { bets: true },
    });
  }

  async findAll(limit: number, offset: number) {
    return this.prisma.round.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { bets: true },
    });
  }

  async create(data: { id?: string; hash?: string; seed?: string; crashPoint?: string }) {
    return this.prisma.round.create({
      data: {
        id: data.id,
        status: "BETTING",
        hash: data.hash,
        seed: data.seed,
        crashPoint: data.crashPoint,
      },
      include: { bets: true },
    });
  }

  async start(id: string, crashPoint: string, startedAt: Date) {
    return this.prisma.round.update({
      where: { id },
      data: {
        status: "RUNNING",
        crashPoint,
        startedAt,
      },
      include: { bets: true },
    });
  }

  async crash(id: string, crashPoint: string, crashedAt: Date) {
    return this.prisma.round.update({
      where: { id },
      data: { 
        status: "ENDED",
        crashPoint,
        crashedAt,
      },
      include: { bets: true },
    });
  }

  async settle(id: string, settledAt: Date) {
    return this.prisma.round.update({
      where: { id },
      data: {
        status: "SETTLED",
        settledAt,
      },
      include: { bets: true },
    });
  }

  async setVerificationData(id: string, hash: string, seed: string) {
    return this.prisma.round.update({
      where: { id },
      data: { hash, seed },
    });
  }
}