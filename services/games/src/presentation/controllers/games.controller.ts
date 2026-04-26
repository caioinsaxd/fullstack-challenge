import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { GameService } from "../../application/services/game.service";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CashoutUseCase } from "../../application/use-cases/cashout.use-case";

class PlaceBetDto {
  playerId: string;
  amount: number;
}

class CashoutDto {
  playerId: string;
  roundId: string;
}

@Controller()
export class GamesController {
  constructor(
    private readonly gameService: GameService,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutUseCase: CashoutUseCase,
  ) {}

  @Get("health")
  check() {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  getCurrentRound() {
    return this.gameService.getOrCreateRound();
  }

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

  @Get("rounds/:roundId/verify")
  verifyRound(@Param("roundId") roundId: string) {
    return this.gameService.verifyRound(roundId);
  }

  @Post("bet")
  placeBet(@Body() dto: PlaceBetDto) {
    return this.placeBetUseCase.execute({
      playerId: dto.playerId,
      amount: dto.amount,
    });
  }

  @Post("bet/cashout")
  cashout(@Body() dto: CashoutDto) {
    return this.cashoutUseCase.execute({
      playerId: dto.playerId,
      roundId: dto.roundId,
    });
  }
}