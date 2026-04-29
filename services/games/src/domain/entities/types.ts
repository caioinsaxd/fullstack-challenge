export enum RoundStatus {
  BETTING = "BETTING",
  RUNNING = "RUNNING",
  ENDED = "ENDED",
}

export enum BetStatus {
  PENDING = "PENDING",
  CASHED_OUT = "CASHED_OUT",
  LOST = "LOST",
  FAILED = "FAILED",
}

export interface Round {
  id: string;
  status: RoundStatus | string;
  crashPoint: string | null;
  hash: string | null;
  seed: string | null;
  startedAt: Date | null;
  crashedAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bets: Bet[];
}

export interface Bet {
  id: string;
  roundId: string;
  playerId: string;
  amount: number;
  status: BetStatus | string;
  cashoutMultiplier: string | null;
  cashoutedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function calculatePayout(bet: Bet): number {
  if (bet.status !== BetStatus.CASHED_OUT || !bet.cashoutMultiplier) {
    return 0;
  }
  const amount = Number(bet.amount);
  const multiplier = Number(bet.cashoutMultiplier);
  return Math.round(amount * multiplier);
}

export function calculateProfit(bet: Bet): number {
  const payout = calculatePayout(bet);
  return payout - bet.amount;
}

export function validateBetAmount(amount: number): boolean {
  const MIN_BET_AMOUNT = 100;
  const MAX_BET_AMOUNT = 100000;
  return amount >= MIN_BET_AMOUNT && amount <= MAX_BET_AMOUNT;
}

export function isValidStatusTransition(
  currentStatus: RoundStatus,
  newStatus: RoundStatus
): boolean {
  const validTransitions: Record<RoundStatus, RoundStatus[]> = {
    [RoundStatus.BETTING]: [RoundStatus.RUNNING],
    [RoundStatus.RUNNING]: [RoundStatus.ENDED],
    [RoundStatus.ENDED]: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}
