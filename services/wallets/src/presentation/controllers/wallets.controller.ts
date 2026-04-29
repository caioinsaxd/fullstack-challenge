import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { WalletRepository } from "../../infrastructure/database/wallet.repository";
import { ApiTags, ApiOperation, ApiProperty, ApiBearerAuth } from "@nestjs/swagger";

class CreateWalletDto {
  @ApiProperty()
  playerId: string;
}

class GetWalletDto {
  @ApiProperty()
  playerId: string;
}

@ApiTags("wallets")
@Controller()
export class WalletsController {
  constructor(private readonly walletRepository: WalletRepository) {}

  @ApiOperation({ summary: "Create wallet" })
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

  @ApiOperation({ summary: "Get my wallet" })
  @ApiBearerAuth()
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
