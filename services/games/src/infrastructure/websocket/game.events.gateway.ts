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
    const event: GameEvent = {
      type: "round:started",
      payload: roundData,
      timestamp: new Date(),
    };
    this.server.emit("round:started", event);
    console.log(`Emitted round:started for ${roundId}`);
  }

  emitBettingEnded(roundId: string) {
    const event: GameEvent = {
      type: "betting:ended",
      payload: { roundId },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("betting:ended", event);
    this.server.emit("betting:ended", event);
  }

  emitMultiplierUpdate(roundId: string, multiplier: string) {
    const event: GameEvent = {
      type: "multiplier:update",
      payload: { roundId, multiplier },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("multiplier:update", event);
  }

  emitRoundCrashed(roundId: string, crashPoint: string, verificationData: unknown) {
    const event: GameEvent = {
      type: "round:crashed",
      payload: { roundId, crashPoint, verificationData },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("round:crashed", event);
    this.server.emit("round:crashed", event);
  }

  emitBetPlaced(roundId: string, betData: { playerId: string; amount: number }) {
    const event: GameEvent = {
      type: "bet:placed",
      payload: { roundId, ...betData },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("bet:placed", event);
    this.server.emit("bet:placed", event);
  }

  emitBetCashedOut(
    roundId: string,
    betData: { playerId: string; amount: number; multiplier: string },
  ) {
    const event: GameEvent = {
      type: "bet:cashed_out",
      payload: { roundId, ...betData },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("bet:cashed_out", event);
    this.server.emit("bet:cashed_out", event);
  }

  emitRoundSettled(roundId: string, winners: unknown[], losers: unknown[]) {
    const event: GameEvent = {
      type: "round:settled",
      payload: { roundId, winners, losers },
      timestamp: new Date(),
    };
    this.server.to(`round:${roundId}`).emit("round:settled", event);
    this.server.emit("round:settled", event);
  }
}