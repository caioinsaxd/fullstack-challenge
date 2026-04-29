import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { WebSocketModule } from "./infrastructure/websocket/websocket.module";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { GamesController } from "./presentation/controllers/games.controller";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashoutUseCase } from "./application/use-cases/cashout.use-case";
import { CancelBetUseCase } from "./application/use-cases/cancel-bet.use-case";
import { GameService } from "./application/services/game.service";
import { GameScheduler } from "./application/services/game.scheduler";

@Module({
  imports: [DatabaseModule, MessagingModule, WebSocketModule, AuthModule],
  controllers: [GamesController],
  providers: [PlaceBetUseCase, CashoutUseCase, CancelBetUseCase, GameService, GameScheduler],
})
export class AppModule {}