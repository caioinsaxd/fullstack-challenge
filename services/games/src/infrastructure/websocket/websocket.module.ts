import { Global, Module } from "@nestjs/common";
import { GameEventsGateway } from "./game.events.gateway";

@Global()
@Module({
  providers: [GameEventsGateway],
  exports: [GameEventsGateway],
})
export class WebSocketModule {}