export interface User {
  id: string;
  username: string;
}

export interface Round {
  id: string;
  crashPoint: number | null;
  status: 'BETTING' | 'RUNNING' | 'ENDED';
  hash: string;
  seed: string;
  startedAt: string | null;
  crashedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
  bets: Bet[];
}

export interface HistoryEntry {
  id: string;
  crashPoint: number;
  timestamp: string;
}

export interface Bet {
  id: string;
  roundId: string;
  playerId: string;
  amount: number;
  cashoutMultiplier: number | null;
  cashoutedAt: string | null;
  status: 'PENDING' | 'CASHED_OUT' | 'LOST';
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  currentRound: Round | null;
  history: Round[];
  myBets: Bet[];
}

export interface WebSocketEvents {
  'round:started': Round;
  'round:crashed': Round;
  'round:ended': Round;
  'bet:placed': Bet;
  'bet:cashed_out': Bet;
  'error': { message: string };
}