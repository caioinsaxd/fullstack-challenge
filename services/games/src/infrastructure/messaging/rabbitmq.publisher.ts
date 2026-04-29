import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";

export interface GameEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface BetPlacedEvent extends GameEvent {
  type: "bet.placed";
  payload: {
    playerId: string;
    roundId: string;
    betId: string;
    amount: number;
  };
}

export interface BetCashedOutEvent extends GameEvent {
  type: "bet.cashed_out";
  payload: {
    playerId: string;
    roundId: string;
    betId: string;
    amount: number;
    multiplier: string;
  };
}

export interface RoundSettledEvent extends GameEvent {
  type: "round.settled";
  payload: {
    roundId: string;
    crashPoint: string;
    winners: Array<{ playerId: string; amount: number }>;
    losers: Array<{ playerId: string; amount: number }>;
  };
}

export interface RoundStartedEvent extends GameEvent {
  type: "round.started";
  payload: {
    roundId: string;
  };
}

export interface BetFailedEvent extends GameEvent {
  type: "bet.failed";
  payload: {
    playerId: string;
    roundId: string;
    betId: string;
    reason: string;
  };
}

export interface BetsRunningEvent extends GameEvent {
  type: "bets.running";
  payload: {
    roundId: string;
    bets: Array<{ playerId: string; betId: string; amount: number }>;
  };
}

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private connection: ReturnType<typeof import("amqplib").connect> | null = null;
  private channel: import("amqplib").Channel | null = null;

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const url = process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672";
    
    try {
      const amqp = await import("amqplib");
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange("game_events", "topic", { durable: true });
      
      console.log("RabbitMQ publisher connected");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      console.error("Error disconnecting from RabbitMQ:", error);
    }
  }

  async publishBetPlaced(event: BetPlacedEvent): Promise<boolean> {
    return this.publish("bet.placed", event);
  }

  async publishBetCashedOut(event: BetCashedOutEvent): Promise<boolean> {
    return this.publish("bet.cashed_out", event);
  }

  async publishRoundSettled(event: RoundSettledEvent): Promise<boolean> {
    return this.publish("round.settled", event);
  }

  async publishRoundStarted(event: RoundStartedEvent): Promise<boolean> {
    return this.publish("round.started", event);
  }

  async publishBetsRunning(event: BetsRunningEvent): Promise<boolean> {
    return this.publish("bets.running", event);
  }

  async publishBetFailed(event: BetFailedEvent): Promise<boolean> {
    return this.publish("bet.failed", event);
  }

  async publishBetPlaced(event: BetPlacedEvent): Promise<boolean> {
    console.log(`[Publisher] Publishing bet.placed: ${JSON.stringify(event)}`);
    return this.publish("bet.placed", event);
  }

  private async publish(routingKey: string, event: GameEvent): Promise<boolean> {
    if (!this.channel) {
      console.error("RabbitMQ channel not available");
      return false;
    }

    try {
      const message = JSON.stringify(event);
      console.log(`[Publisher] Publishing to '${routingKey}': ${message.substring(0, 200)}`);
      return this.channel.publish("game_events", routingKey, Buffer.from(message), {
        persistent: true,
      });
    } catch (error) {
      console.error(`Failed to publish ${routingKey}:`, error);
      return false;
    }
  }
}