import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { BetRepository } from "../../infrastructure/database/bet.repository";
import { RabbitMQPublisher } from "../../infrastructure/messaging/rabbitmq.publisher";

/**
 * WALLET DEDUCTION FLOW - CRITICAL BUSINESS LOGIC
 * 
 * This use case creates a bet but does NOT deduct from wallet yet.
 * The wallet deduction is deliberately deferred until the round actually starts.
 * 
 * Timeline:
 * 1. BETTING PHASE (0-15 seconds):
 *    - User clicks "Launch Mission" and calls placeBet()
 *    - Bet is created with status = PENDING
 *    - NO wallet deduction happens here
 *    - User can still cancel the bet (via cancelBet) without losing money
 * 
 * 2. ROUND STARTS (after 15 seconds):
 *    - GameScheduler.runRound() is called
 *    - publishBetsRunning() event is sent to wallet service
 *    - Wallet service receives bets.running event
 *    - ONLY NOW wallet is deducted for all active bets
 *    - This is the point of no return for the bet
 * 
 * 3. RUNNING PHASE:
 *    - User can cashout to receive winnings
 *    - Or user doesn't cashout and loses the bet if game crashes
 * 
 * SAFETY: This design prevents wallet deduction for cancelled bets
 */
export interface PlaceBetInput {
  playerId: string;
  amount: number;
}

export interface PlaceBetOutput {
  betId: string;
  roundId: string;
  amount: number;
  status: string;
}

@Injectable()
export class PlaceBetUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findCurrentRound();
    
    if (!round || round.status !== "BETTING") {
      throw new Error("Round is not accepting bets");
    }

    const existingBet = await this.betRepository.findByPlayerAndRound(
      input.playerId,
      round.id,
    );

    if (existingBet) {
      throw new Error("Player already has a bet in this round");
    }

    const bet = await this.betRepository.create({
      roundId: round.id,
      playerId: input.playerId,
      amount: input.amount,
    });

    console.log(`[PlaceBet] Bet created (NO WALLET DEDUCTION YET) - Player: ${input.playerId}, Amount: ${input.amount}, Round: ${round.id}, Bet ID: ${bet.id}`);
    console.log(`[PlaceBet] Wallet will be deducted when round starts (15 seconds). User can still cancel until then.`);

    await this.publisher.publishBetPlaced({
      type: "bet.placed",
      payload: {
        playerId: input.playerId,
        roundId: round.id,
        betId: bet.id,
        amount: input.amount,
      },
      timestamp: new Date(),
    });

    return {
      betId: bet.id,
      roundId: bet.roundId,
      amount: Number(bet.amount),
      status: bet.status,
    };
  }
}