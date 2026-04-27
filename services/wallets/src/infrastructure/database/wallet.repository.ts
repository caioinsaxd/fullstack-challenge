import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayerId(playerId: string) {
    return this.prisma.wallet.findUnique({
      where: { playerId },
    });
  }

  async create(playerId: string) {
    return this.prisma.wallet.create({
      data: {
        playerId,
        balance: 0,
      },
    });
  }

  async getOrCreate(playerId: string) {
    let wallet = await this.findByPlayerId(playerId);
    
    if (!wallet) {
      wallet = await this.create(playerId);
    }
    
    return wallet;
  }

  async credit(playerId: string, amount: number) {
    const wallet = await this.findByPlayerId(playerId);
    
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return this.prisma.wallet.update({
      where: { playerId },
      data: { balance: wallet.balance + amount },
    });
  }

  async debit(playerId: string, amount: number) {
    const wallet = await this.findByPlayerId(playerId);
    
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    return this.prisma.wallet.update({
      where: { playerId },
      data: { balance: wallet.balance - amount },
    });
  }
}