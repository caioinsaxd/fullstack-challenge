import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpException, HttpStatus, Delete } from "@nestjs/common";
import { GameService } from "../../application/services/game.service";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CashoutUseCase } from "../../application/use-cases/cashout.use-case";
import { CancelBetUseCase } from "../../application/use-cases/cancel-bet.use-case";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/auth/current-user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiProperty } from "@nestjs/swagger";

class PlaceBetDto {
  @ApiProperty()
  playerId?: string;
  @ApiProperty()
  amount: number;
}

class CashoutDto {
  @ApiProperty()
  playerId?: string;
  @ApiProperty()
  roundId: string;
}

@ApiTags("games")
@Controller()
export class GamesController {
  constructor(
    private readonly gameService: GameService,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutUseCase: CashoutUseCase,
    private readonly cancelBetUseCase: CancelBetUseCase,
  ) {}

  @ApiOperation({ summary: "Health check" })
  @Get("health")
  check() {
    return { status: "ok", service: "games" };
  }

  @ApiOperation({ summary: "Get current round" })
  @ApiResponse({ status: 200, description: "Current round data" })
  @Get("rounds/current")
  getCurrentRound() {
    return this.gameService.getOrCreateRound();
  }

  @ApiOperation({ summary: "Get round history" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Get("rounds/history")
  getRoundHistory(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    return this.gameService.getRoundHistory(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @ApiOperation({ summary: "Verify round provably fair" })
  @Get("rounds/:roundId/verify")
  verifyRound(@Param("roundId") roundId: string) {
    return this.gameService.verifyRound(roundId);
  }

  @ApiOperation({ summary: "Place a bet" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("bet")
  async placeBet(
    @Body() dto: PlaceBetDto,
    @CurrentUser() user: { playerId: string } | undefined,
  ) {
    const playerId = user?.playerId || dto.playerId;
    if (!playerId) {
      throw new HttpException("Player ID is required", HttpStatus.BAD_REQUEST);
    }
    console.log(`[PlaceBet] playerId: ${playerId}, amount: ${dto.amount}`);
    try {
      const result = await this.placeBetUseCase.execute({
        playerId,
        amount: dto.amount,
      });
      console.log(`[PlaceBet] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error(`[PlaceBet] Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Cash out bet" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("bet/cashout")
  async cashout(
    @Body() dto: CashoutDto,
    @CurrentUser() user: { playerId: string } | undefined,
  ) {
    const playerId = user?.playerId || dto.playerId;
    if (!playerId) {
      throw new HttpException("Player ID is required", HttpStatus.BAD_REQUEST);
    }
    if (!dto.roundId) {
      throw new HttpException("Round ID is required", HttpStatus.BAD_REQUEST);
    }
    console.log(`[Cashout] playerId: ${playerId}, roundId: ${dto.roundId}`);
    try {
      const result = await this.cashoutUseCase.execute({
        playerId,
        roundId: dto.roundId,
      });
      console.log(`[Cashout] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error(`[Cashout] Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Cancel bet" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete("bet/:roundId")
  async cancelBet(
    @Param("roundId") roundId: string,
    @CurrentUser() user: { playerId: string } | undefined,
  ) {
    const playerId = user?.playerId;
    if (!playerId) {
      throw new HttpException("Player ID is required", HttpStatus.BAD_REQUEST);
    }
    console.log(`[CancelBet] playerId: ${playerId}, roundId: ${roundId}`);
    try {
      const result = await this.cancelBetUseCase.execute({
        playerId,
        roundId,
      });
      console.log(`[CancelBet] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error(`[CancelBet] Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Get my bets" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("bets/me")
  getMyBets(
    @CurrentUser() user: { playerId: string } | undefined,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    const playerId = user?.playerId;
    if (!playerId) {
      throw new HttpException("Player ID is required", HttpStatus.BAD_REQUEST);
    }
    return this.gameService.getPlayerBets(
      playerId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}