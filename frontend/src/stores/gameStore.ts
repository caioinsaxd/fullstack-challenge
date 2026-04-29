import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Round, Bet, GameState, HistoryEntry } from '../types';

interface GameStore extends GameState {
  crashPoint: number | null;
  multiplier: number;
  elapsedTime: number;
  isLoading: boolean;
  error: string | null;
  autoCashout: number | null;
  autoBetAmount: number | null;
  autoBetEnabled: boolean;
  autoBetRounds: number;
  soundEnabled: boolean;
  roundHistory: HistoryEntry[];
  bettingEndsAt: number | null;
  
  setCurrentRound: (round: Round | null) => void;
  setCrashPoint: (crashPoint: number | null) => void;
  setMultiplier: (multiplier: number) => void;
  setElapsedTime: (time: number) => void;
  setHistory: (rounds: Round[]) => void;
  setMyBets: (bets: Bet[]) => void;
  addBet: (bet: Bet) => void;
  updateBet: (bet: Bet) => void;
  removeBet: (betId: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoCashout: (value: number | null) => void;
  setAutoBetAmount: (amount: number | null) => void;
  setAutoBetEnabled: (enabled: boolean) => void;
  setAutoBetRounds: (rounds: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  addRoundHistory: (entry: HistoryEntry) => void;
  setBettingEndsAt: (time: number | null) => void;
  reset: () => void;
}

const initialState = {
  currentRound: null,
  history: [],
  myBets: [],
  crashPoint: null,
  multiplier: 1.0,
  elapsedTime: 0,
  isLoading: false,
  error: null,
  autoCashout: null,
  autoBetAmount: null,
  autoBetEnabled: false,
  autoBetRounds: 1,
  soundEnabled: true,
  roundHistory: [],
  bettingEndsAt: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCurrentRound: (round) => set({ currentRound: round }),
      setCrashPoint: (crashPoint) => set({ crashPoint }),
      setMultiplier: (multiplier) => set({ multiplier }),
      setElapsedTime: (elapsedTime) => set({ elapsedTime }),
      setHistory: (rounds) => set({ history: rounds }),
      setMyBets: (bets) => set({ myBets: bets }),
      addBet: (bet) => set((state) => ({ myBets: [bet, ...state.myBets] })),
      updateBet: (bet) => set((state) => ({
        myBets: bet && bet.id 
          ? state.myBets.map((b) => b.id === bet.id ? bet : b)
          : state.myBets,
      })),
      removeBet: (betId) => set((state) => ({
        myBets: state.myBets.filter((b) => b.id !== betId),
      })),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setAutoCashout: (autoCashout) => set({ autoCashout }),
      setAutoBetAmount: (autoBetAmount) => set({ autoBetAmount }),
      setAutoBetEnabled: (autoBetEnabled) => set({ autoBetEnabled }),
      setAutoBetRounds: (autoBetRounds) => set({ autoBetRounds }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      addRoundHistory: (entry) => set((state) => ({ 
        roundHistory: [entry, ...state.roundHistory].slice(0, 30) 
      })),
      setBettingEndsAt: (bettingEndsAt) => set({ bettingEndsAt }),
      reset: () => set(initialState),
    }),
{
      name: 'crash-game-storage',
      partialize: (state) => ({ 
        roundHistory: state.roundHistory,
        autoCashout: state.autoCashout,
        autoBetAmount: state.autoBetAmount,
        autoBetEnabled: state.autoBetEnabled,
        autoBetRounds: state.autoBetRounds,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);