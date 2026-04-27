import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { WebSocketModule } from "./infrastructure/websocket/websocket.module";
import { GamesController } from "./presentation/controllers/games.controller";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashoutUseCase } from "./application/use-cases/cashout.use-case";
import { GameService } from "./application/services/game.service";

@Module({
  imports: [DatabaseModule, MessagingModule, WebSocketModule],
  controllers: [GamesController],
  providers: [PlaceBetUseCase, CashoutUseCase, GameService],
})
export class AppModule {}
