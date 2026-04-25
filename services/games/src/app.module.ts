import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [GamesController],
})
export class AppModule {}
