import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { WalletRepository } from "../../infrastructure/database/wallet.repository";

class CreateWalletDto {
  playerId: string;
}

class GetWalletDto {
  playerId: string;
}

@Controller("/wallets")
export class WalletsController {
  constructor(private readonly walletRepository: WalletRepository) {}

  @Post()
  async create(@Body() dto: CreateWalletDto) {
    const wallet = await this.walletRepository.getOrCreate(dto.playerId);
    
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
    };
  }

  @Get("me")
  async getMe(@Query() dto: GetWalletDto) {
    const wallet = await this.walletRepository.getOrCreate(dto.playerId);
    
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
