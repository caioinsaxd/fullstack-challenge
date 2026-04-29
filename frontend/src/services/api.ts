import axios from 'axios';
import type { Round, Bet, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export async function getCurrentRound(): Promise<Round> {
  const { data } = await api.get('/games/rounds/current');
  return data;
}

export async function getRoundHistory(): Promise<Round[]> {
  const { data } = await api.get('/games/rounds/history');
  return data;
}

export interface VerificationResponse {
  seed: string;
  hash: string;
  crashPoint: number;
  verified: boolean;
  houseEdge?: number;
}

export async function verifyRound(roundId: string): Promise<VerificationResponse> {
  const { data } = await api.get(`/games/rounds/${roundId}/verify`);
  return data;
}

export async function getMyBets(): Promise<Bet[]> {
  const { data } = await api.get('/games/bets/me');
  return data;
}

export async function placeBet(roundId: string, amount: number): Promise<Bet> {
  const { data } = await api.post('/games/bet', { roundId, amount });
  return data;
}

export async function cashout(roundId: string): Promise<{ betId: string; amount: number; cashoutMultiplier: string; profit: number }> {
  const { data } = await api.post('/games/bet/cashout', { roundId });
  return data;
}

export async function cancelBet(roundId: string): Promise<{ success: boolean; betId: string }> {
  const { data } = await api.delete(`/games/bet/${roundId}`);
  return data;
}

export async function getUser(): Promise<User> {
  const { data } = await api.get('/users/me');
  return data;
}

export async function getWalletBalance(playerId: string): Promise<number> {
  const { data } = await api.get(`/wallets/me?playerId=${playerId}`);
  return data.balance;
}

export { api };