import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

const MIN_BET_AMOUNT = 100;
const MAX_BET_AMOUNT = 100000;

function validateBetAmount(amount: number): boolean {
  return amount >= MIN_BET_AMOUNT && amount <= MAX_BET_AMOUNT;
}

@Injectable()
export class BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.bet.findUnique({ where: { id } });
  }

  async findByRoundId(roundId: string) {
    return this.prisma.bet.findMany({ where: { roundId } });
  }

  async findByPlayerAndRound(playerId: string, roundId: string) {
    return this.prisma.bet.findFirst({ where: { playerId, roundId } });
  }

  async findByPlayerId(playerId: string, limit: number, offset: number) {
    return this.prisma.bet.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async create(data: { id?: string; roundId: string; playerId: string; amount: number }) {
    if (!validateBetAmount(data.amount)) {
      throw new Error(`Invalid bet amount: ${data.amount}`);
    }
    return this.prisma.bet.create({
      data: {
        id: data.id,
        roundId: data.roundId,
        playerId: data.playerId,
        amount: data.amount,
        status: "PENDING",
      },
    });
  }

  async cashout(id: string, cashoutMultiplier: string, cashoutedAt: Date) {
    return this.prisma.bet.update({
      where: { id },
      data: {
        status: "CASHED_OUT",
        cashoutMultiplier,
        cashoutedAt,
      },
    });
  }

  async settle(roundId: string, status: "CASHED_OUT" | "LOST") {
    const pendingBets = await this.prisma.bet.findMany({
      where: { roundId, status: "PENDING" },
    });

    const updatePromises = pendingBets.map((bet) =>
      this.prisma.bet.update({
        where: { id: bet.id },
        data: { status },
      })
    );

    return Promise.all(updatePromises);
  }

  async updateStatus(id: string, status: "CASHED_OUT" | "LOST") {
    return this.prisma.bet.update({
      where: { id },
      data: { status },
    });
  }

  async setLost(id: string) {
    return this.prisma.bet.update({
      where: { id },
      data: { status: "LOST" },
    });
  }

  async markFailed(id: string) {
    return this.prisma.bet.update({
      where: { id },
      data: { status: "FAILED" },
    });
  }

  async delete(id: string) {
    return this.prisma.bet.delete({ where: { id } });
  }
}