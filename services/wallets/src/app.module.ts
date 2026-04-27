import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { WalletRepository } from "./infrastructure/database/wallet.repository";

@Module({
  imports: [DatabaseModule, MessagingModule],
  controllers: [WalletsController],
  providers: [WalletRepository],
})
export class AppModule {}