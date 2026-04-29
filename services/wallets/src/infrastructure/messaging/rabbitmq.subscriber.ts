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

interface BetsRunningPayload {
  roundId: string;
  bets: Array<{ playerId: string; betId: string; amount: number }>;
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
      await this.channel.bindQueue("wallet_events", "game_events", "bets.running");
      await this.channel.bindQueue("wallet_events", "game_events", "bet.cashed_out");
      await this.channel.bindQueue("wallet_events", "game_events", "round.settled");
      await this.channel.bindQueue("wallet_events", "game_events", "bet.deduction_failed");
      await this.channel.bindQueue("wallet_events", "game_events", "bet.placed");
      
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
        console.log(`[Wallet] FULL EVENT: ${JSON.stringify(event)}`);
        
        const eventType = event.type?.trim() || "";
        console.log(`[Wallet] Event type raw: '${eventType}'`);
        
        if (eventType === "bets.running") {
          console.log(`[Wallet] Processing bets.running event for round ${event.payload.roundId}`);
          await this.handleBetsRunning(event.payload as BetsRunningPayload);
        } else if (eventType === "bet.cashed_out" || eventType.includes("cashed")) {
          console.log(`[Wallet] Processing bet.cashed_out event for player ${event.payload.playerId}`);
          await this.handleBetCashedOut(event.payload as BetCashedOutPayload);
        } else if (eventType === "bet.placed" || eventType.includes("placed")) {
          console.log(`[Wallet] Processing bet.placed event - deducting immediately`);
          await this.handleBetPlaced(event.payload as BetPlacedPayload);
        } else if (eventType === "round.settled" || eventType.includes("settled")) {
          console.log(`[Wallet] Processing round.settled event for round ${event.payload.roundId}`);
          await this.handleRoundSettled(event.payload as RoundSettledPayload);
        } else {
          console.log(`[Wallet] Ignoring unknown event: '${eventType}'`);
        }

        this.channel.ack(msg);
      } catch (error) {
        console.error("Error processing message:", error);
        this.channel.nack(msg, false, false);
      }
    });
  }

  private async handleBetPlaced(payload: BetPlacedPayload): Promise<boolean> {
    const { playerId, amount } = payload;

    let wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      console.log(`[Wallet] No wallet for player ${playerId} - creating with 0 balance`);
      wallet = await this.prisma.wallet.create({
        data: { playerId, balance: 0 },
      });
    }

    if (wallet.balance < amount) {
      console.log(`[Wallet] Skipping deduction - insufficient balance for player ${playerId} (${wallet.balance} < ${amount})`);
      return false; // Signal failure - do NOT deduct
    }

    await this.prisma.wallet.update({
      where: { playerId },
      data: { balance: wallet.balance - amount },
    });

    console.log(`[Wallet] Deducted ${amount} from player ${playerId}`);
    return true;
  }

  private async handleBetsRunning(payload: BetsRunningPayload): Promise<void> {
    const { roundId, bets } = payload;
    console.log(`[Wallet:BetsRunning] WALLET DEDUCTION TRIGGERED - Round ${roundId} started. Deducting wallet for ${bets.length} bets`);
    
    for (const bet of bets) {
      const { playerId, amount } = bet;
      let wallet = await this.prisma.wallet.findUnique({ where: { playerId } });
      
      if (!wallet) {
        console.error(`[Wallet:BetsRunning] ERROR - Wallet not found for player ${playerId}. Cannot deduct ${amount}.`);
        throw new Error(`Wallet not found for player ${playerId}`);
      }
      
      if (wallet.balance < amount) {
        console.error(`[Wallet:BetsRunning] ERROR - Insufficient balance for player ${playerId}: ${wallet.balance} < ${amount}. Cannot deduct.`);
        throw new Error(`Insufficient balance: have ${wallet.balance}, need ${amount}`);
      }
      
      const previousBalance = wallet.balance;
      await this.prisma.wallet.update({
        where: { playerId },
        data: { balance: wallet.balance - amount },
      });
      console.log(`[Wallet:BetsRunning] SUCCESS - Deducted ${amount} from player ${playerId} for round ${roundId} (${previousBalance} -> ${previousBalance - amount})`);
    }
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