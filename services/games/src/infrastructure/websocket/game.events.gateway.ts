import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

export interface GameEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class GameEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId?: string },
  ) {
    if (data.roundId) {
      client.join(`round:${data.roundId}`);
      console.log(`Client ${client.id} subscribed to round ${data.roundId}`);
    }
    return { status: "subscribed" };
  }

  emitRoundStarted(roundId: string, roundData: unknown) {
    console.log(`Emitting round:started for ${roundId} with data:`, roundData);
    this.server.emit("round:started", roundData);
  }

  emitBettingEnded(roundId: string) {
    this.server.emit("betting:ended", { roundId });
  }

  emitMultiplierUpdate(roundId: string, multiplier: string) {
    // Emit globally so ALL clients receive the update (not just room subscribers)
    this.server.emit("multiplier:update", { roundId, multiplier });
  }

  emitRoundCrashed(roundId: string, crashPoint: string, verificationData: unknown) {
    this.server.emit("round:crashed", { roundId, crashPoint, verificationData });
  }

  emitBetPlaced(roundId: string, betData: { playerId: string; amount: number }) {
    this.server.emit("bet:placed", { roundId, ...betData });
  }

  emitBetCashedOut(
    roundId: string,
    betData: { playerId: string; amount: number; multiplier: string },
  ) {
    this.server.emit("bet:cashed_out", { roundId, ...betData });
  }

  emitRoundSettled(roundId: string, crashPoint: string, winners: unknown[], losers: unknown[]) {
    this.server.emit("round:settled", { roundId, crashPoint, winners, losers });
  }
}