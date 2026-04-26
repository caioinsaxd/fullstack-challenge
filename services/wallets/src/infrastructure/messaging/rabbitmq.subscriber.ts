import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

interface BetPlacedPayload {
  playerId: string;
  roundId: string;
  betId: string;
  amount: number;
}

interface BetCashedOutPayload {
  playerId: string;
  roundId: string;
  betId: string;
  amount: number;
  multiplier: string;
}

interface RoundSettledPayload {
  roundId: string;
  crashPoint: string;
  winners: Array<{ playerId: string; amount: number }>;
  losers: Array<{ playerId: string; amount: number }>;
}

@Injectable()
export class RabbitMQSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: Awaited<ReturnType<typeof import("amqplib").connect>> | null = null;
  private channel: import("amqplib").Channel | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.subscribe();
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
      await this.channel.assertQueue("wallet_events", { durable: true });
      await this.channel.bindQueue("wallet_events", "game_events", "bet.*");
      await this.channel.bindQueue("wallet_events", "game_events", "round.settled");
      
      console.log("RabbitMQ subscriber connected");
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

  private async subscribe(): Promise<void> {
    if (!this.channel) {
      console.error("RabbitMQ channel not available");
      return;
    }

    await this.channel.consume("wallet_events", async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        
        switch (event.type) {
          case "bet.placed":
            await this.handleBetPlaced(event.payload as BetPlacedPayload);
            break;
          case "bet.cashed_out":
            await this.handleBetCashedOut(event.payload as BetCashedOutPayload);
            break;
          case "round.settled":
            await this.handleRoundSettled(event.payload as RoundSettledPayload);
            break;
        }

        this.channel.ack(msg);
      } catch (error) {
        console.error("Error processing message:", error);
        this.channel.nack(msg, false, false);
      }
    });
  }

  private async handleBetPlaced(payload: BetPlacedPayload): Promise<void> {
    const { playerId, amount } = payload;

    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      console.error(`Wallet not found for player: ${playerId}`);
      return;
    }

    if (wallet.balance < amount) {
      console.error(`Insufficient balance for player: ${playerId}`);
      return;
    }

    await this.prisma.wallet.update({
      where: { playerId },
      data: { balance: wallet.balance - amount },
    });

    console.log(`Deducted ${amount} from player ${playerId}`);
  }

  private async handleBetCashedOut(payload: BetCashedOutPayload): Promise<void> {
    const { playerId, amount } = payload;

    let wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { playerId, balance: amount },
      });
    } else {
      await this.prisma.wallet.update({
        where: { playerId },
        data: { balance: wallet.balance + amount },
      });
    }

    console.log(`Added ${amount} to player ${playerId}`);
  }

  private async handleRoundSettled(payload: RoundSettledPayload): Promise<void> {
    const { winners, losers } = payload;

    for (const winner of winners) {
      const { playerId, amount } = winner;
      
      let wallet = await this.prisma.wallet.findUnique({
        where: { playerId },
      });

      if (!wallet) {
        wallet = await this.prisma.wallet.create({
          data: { playerId, balance: amount },
        });
      } else {
        await this.prisma.wallet.update({
          where: { playerId },
          data: { balance: wallet.balance + amount },
        });
      }
    }

    console.log(`Round settled: ${winners.length} winners, ${losers.length} losers`);
  }
}