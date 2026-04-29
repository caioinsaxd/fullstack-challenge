import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";
import { GameEventsGateway } from "../../infrastructure/websocket/game.events.gateway";
import { RabbitMQPublisher } from "../../infrastructure/messaging/rabbitmq.publisher";

interface GameLoop {
  roundId: string;
  crashPoint: number;
  startTimeout: ReturnType<typeof setTimeout> | null;
  crashInterval: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
}

@Injectable()
export class GameScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameScheduler.name);
  private gameLoop: GameLoop | null = null;
  private readonly BETTING_DURATION = 15000;
  private readonly CRASH_CHECK_INTERVAL = 100;

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly provablyFairService: ProvablyFairService,
    private readonly gameEvents: GameEventsGateway,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  async onModuleInit() {
    this.logger.log("Initializing game scheduler...");
    await this.startNewRound();
  }

  async onModuleDestroy() {
    this.stopAllTimers();
  }

  private stopAllTimers() {
    if (this.gameLoop) {
      if (this.gameLoop.startTimeout) {
        clearTimeout(this.gameLoop.startTimeout);
      }
      if (this.gameLoop.crashInterval) {
        clearInterval(this.gameLoop.crashInterval);
      }
    }
  }

  async startNewRound() {
    try {
      let currentRound = await this.roundRepository.findCurrentRound();

      if (!currentRound) {
        const pfResult = this.provablyFairService.generate(`round-${Date.now()}`);
        currentRound = await this.roundRepository.create({
          id: pfResult.hash.substring(0, 16),
          hash: pfResult.hash,
          seed: pfResult.seed,
          crashPoint: pfResult.crashPoint,
        });
        this.logger.log(`Created new round: ${currentRound.id} with crash point: ${pfResult.crashPoint}x`);
      }

      if (currentRound.status === "BETTING" && !this.gameLoop?.isRunning) {
        const crashPoint = parseFloat(currentRound.crashPoint || "1.00");
        
        if (crashPoint < 1.01) {
          this.logger.warn(`Invalid crash point ${crashPoint}, treating as 1.01`);
        }
        
        this.gameLoop = {
          roundId: currentRound.id,
          crashPoint: Math.max(crashPoint, 1.01),
          startTimeout: null,
          crashInterval: null,
          isRunning: false,
        };

        this.gameLoop.startTimeout = setTimeout(() => {
          this.runRound();
        }, this.BETTING_DURATION);
      } else if (currentRound.status === "RUNNING" && !this.gameLoop?.isRunning) {
        this.logger.log(`Resuming interrupted round: ${currentRound.id}`);
        
        const crashPoint = parseFloat(currentRound.crashPoint || "1.01");
        const startedAt = currentRound.startedAt ? new Date(currentRound.startedAt).getTime() : Date.now();
        
        this.gameLoop = {
          roundId: currentRound.id,
          crashPoint: Math.max(crashPoint, 1.01),
          startTimeout: null,
          crashInterval: null,
          isRunning: true,
        };
        
        this.resumeCrashSimulation(startedAt);
      }
    } catch (error) {
      this.logger.error(`Error starting new round: ${error.message}`);
      setTimeout(() => this.startNewRound(), 5000);
    }
  }

  private async runRound() {
    if (!this.gameLoop || this.gameLoop.isRunning) return;

    try {
      const round = await this.roundRepository.findById(this.gameLoop.roundId);
      if (!round) {
        this.scheduleNextRound();
        return;
      }

      // Start the round
      const startResult = await this.roundRepository.start(
        this.gameLoop.roundId,
        this.gameLoop.crashPoint.toString(),
        new Date(),
      );

      this.gameLoop.isRunning = true;

      // Publish bets.running event - this triggers wallet deduction in the wallet service
      // IMPORTANT: Wallet deduction happens NOW, not when the bet was placed
      const allBets = await this.betRepository.findByRoundId(this.gameLoop.roundId);
      if (allBets.length > 0) {
        const totalAmount = allBets.reduce((sum, b) => sum + Number(b.amount), 0);
        this.logger.log(`========================================`);
        this.logger.log(`ROUND STARTED - WALLET DEDUCTIONS BEGIN`);
        this.logger.log(`Round ID: ${this.gameLoop.roundId}`);
        this.logger.log(`Number of bets: ${allBets.length}`);
        this.logger.log(`Total amount being deducted: ${totalAmount}`);
        this.logger.log(`Individual bets: ${allBets.map(b => `${b.playerId.substring(0, 8)}... (${Number(b.amount)})`).join(', ')}`);
        this.logger.log(`Publishing bets.running event to wallet service...`);
        this.logger.log(`========================================`);
        
        await this.publisher.publishBetsRunning({
          type: "bets.running",
          payload: {
            roundId: this.gameLoop.roundId,
            bets: allBets.map(b => ({
              playerId: b.playerId,
              betId: b.id,
              amount: Number(b.amount),
            })),
          },
          timestamp: new Date(),
        });
        
        for (const bet of allBets) {
          try {
            const WALLET_URL = process.env.WALLET_SERVICE_URL || "http://localhost:4002";
            const resp = await fetch(`${WALLET_URL}/wallets/me?playerId=${bet.playerId}`);
            const wallet = await resp.json();
            if (wallet.balance >= Number(bet.amount)) {
              await this.betRepository.markFailed(bet.id);
              this.logger.log(`Bet ${bet.id} marked FAILED - insufficient balance at round start`);
            }
          } catch (e) {
            this.logger.error(`Failed to verify bet ${bet.id}: ${e.message}`);
          }
        }
      }

      this.gameEvents.emitRoundStarted(this.gameLoop.roundId, startResult);

      this.gameEvents.emitBettingEnded(this.gameLoop.roundId);

      this.logger.log(`Round ${this.gameLoop.roundId} started - Crash at ${this.gameLoop.crashPoint}x`);

      this.runCrashSimulation();
    } catch (error) {
      this.logger.error(`Error running round: ${error.message}`);
      this.scheduleNextRound();
    }
  }

  private runCrashSimulation() {
    if (!this.gameLoop || !this.gameLoop.isRunning) return;

    let currentMultiplier = 1.0;
    const crashPoint = this.gameLoop.crashPoint;
    const startTime = Date.now();
    const CHECK_INTERVAL_MS = 100;

    this.logger.log(`Starting crash simulation - crashPoint: ${crashPoint}, startTime: ${startTime}`);

    this.gameLoop.crashInterval = setInterval(async () => {
      if (!this.gameLoop?.isRunning) {
        clearInterval(this.gameLoop.crashInterval!);
        return;
      }

      const elapsedSeconds = (Date.now() - startTime) / 1000;
      
      const getMultiplierFromTime = (seconds: number): number => {
        let m = 1.0;
        let remainingSecs = seconds;
        
        if (remainingSecs <= 0) return 1.0;
        
        if (remainingSecs <= 10) {
          return 1.0 + remainingSecs * 0.1;
        }
        remainingSecs -= 10;
        
        if (remainingSecs <= 10) {
          return 2.0 + remainingSecs * 0.3;
        }
        remainingSecs -= 10;
        
        if (remainingSecs <= 10) {
          return 5.0 + remainingSecs * 0.5;
        }
        remainingSecs -= 10;
        
        if (remainingSecs <= 10) {
          return 10.0 + remainingSecs * 1.0;
        }
        remainingSecs -= 10;
        
        if (remainingSecs <= 10) {
          return 20.0 + remainingSecs * 3.0;
        }
        remainingSecs -= 10;
        
        if (remainingSecs <= 10) {
          return 50.0 + remainingSecs * 5.0;
        }
        remainingSecs -= 10;
        
        return 100.0 + remainingSecs * 10.0;
      };

      currentMultiplier = getMultiplierFromTime(elapsedSeconds);

      if (currentMultiplier >= crashPoint) {
        currentMultiplier = crashPoint;
      }

      this.gameEvents.emitMultiplierUpdate(this.gameLoop.roundId, currentMultiplier.toFixed(2));
      this.logger.log(`MULTIPLIER UPDATE: ${currentMultiplier.toFixed(2)}x`);

      if (currentMultiplier >= crashPoint) {
        this.logger.log(`Crash condition met - currentMultiplier: ${currentMultiplier}, crashPoint: ${crashPoint}`);
        clearInterval(this.gameLoop.crashInterval!);
        await this.crashRound(crashPoint);
      }
}, CHECK_INTERVAL_MS);
  }

  private resumeCrashSimulation(originalStartTime: number) {
    if (!this.gameLoop || !this.gameLoop.isRunning) return;

    const crashPoint = this.gameLoop.crashPoint;
    const CHECK_INTERVAL_MS = 100;

    this.logger.log(`Resuming crash simulation - crashPoint: ${crashPoint}, originalStartTime: ${originalStartTime}`);

    this.gameLoop.crashInterval = setInterval(async () => {
      if (!this.gameLoop?.isRunning) {
        clearInterval(this.gameLoop.crashInterval!);
        return;
      }

      const elapsedSeconds = (Date.now() - originalStartTime) / 1000;
      const getMultiplierFromTime = (seconds: number): number => {
        if (seconds <= 10) return 1.0 + seconds * 0.1;
        if (seconds <= 20) return 2.0 + (seconds - 10) * 0.3;
        if (seconds <= 30) return 5.0 + (seconds - 20) * 0.5;
        if (seconds <= 40) return 10.0 + (seconds - 30) * 1.0;
        if (seconds <= 50) return 20.0 + (seconds - 40) * 3.0;
        if (seconds <= 60) return 50.0 + (seconds - 50) * 5.0;
        return 100.0 + (seconds - 60) * 10.0;
      };

      let currentMultiplier = getMultiplierFromTime(elapsedSeconds);
      if (currentMultiplier >= crashPoint) {
        currentMultiplier = crashPoint;
      }

      this.gameEvents.emitMultiplierUpdate(this.gameLoop.roundId, currentMultiplier.toFixed(2));

      if (currentMultiplier >= crashPoint) {
        this.logger.log(`Crash condition met - currentMultiplier: ${currentMultiplier}, crashPoint: ${crashPoint}`);
        clearInterval(this.gameLoop.crashInterval!);
        await this.crashRound(crashPoint);
      }
    }, CHECK_INTERVAL_MS);
  }

  private async crashRound(crashPoint: number) {
    if (!this.gameLoop) return;

    try {
      const round = await this.roundRepository.findById(this.gameLoop.roundId);
      if (!round) {
        this.scheduleNextRound();
        return;
      }

      await this.roundRepository.crash(this.gameLoop.roundId, crashPoint.toString(), new Date());

      this.gameEvents.emitRoundCrashed(
        this.gameLoop.roundId,
        crashPoint.toString(),
        { hash: round.hash, seed: round.seed },
      );

      this.logger.log(`Round ${this.gameLoop.roundId} crashed at ${crashPoint}x`);

      const bets = round.bets || [];
      for (const bet of bets) {
        if (bet.status === "PENDING") {
          await this.betRepository.setLost(bet.id);
        }
      }

      const winners = bets.filter(b => b.status === "CASHED_OUT");
      const losers = bets.filter(b => b.status === "LOST" || b.status === "PENDING");
      this.gameEvents.emitRoundSettled(this.gameLoop.roundId, crashPoint.toString(), winners, losers);

      this.gameLoop.isRunning = false;
      this.gameLoop.crashInterval = null;

      this.scheduleNextRound();
    } catch (error) {
      this.logger.error(`Error crashing round: ${error.message}`);
      this.scheduleNextRound();
    }
  }

  private scheduleNextRound() {
    if (this.gameLoop) {
      if (this.gameLoop.startTimeout) {
        clearTimeout(this.gameLoop.startTimeout);
      }
      if (this.gameLoop.crashInterval) {
        clearInterval(this.gameLoop.crashInterval);
      }
    }

    setTimeout(() => this.startNewRound(), 2500);
  }
}