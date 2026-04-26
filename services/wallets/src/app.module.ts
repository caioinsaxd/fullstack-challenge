import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [DatabaseModule, MessagingModule],
  controllers: [WalletsController],
})
export class AppModule {}