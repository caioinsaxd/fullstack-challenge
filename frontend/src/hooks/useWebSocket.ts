import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';
import { getCurrentRound, placeBet, cashout } from '../services/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasAutoBetPlaced = useRef(false);
  const hasAutoCashedOut = useRef(false);
  
  const {
    setCurrentRound,
    setCrashPoint,
    setMultiplier,
    addBet,
    updateBet,
    soundEnabled,
    addRoundHistory,
    setBettingEndsAt,
  } = useGameStore();

  const playSound = useCallback((type: 'crash' | 'bet' | 'cashout') => {
    if (!soundEnabled) return;
    
    const audio = new Audio();
    switch (type) {
      case 'crash':
        audio.src = '/sounds/crash.mp3';
        break;
      case 'bet':
        audio.src = '/sounds/bet.mp3';
        break;
      case 'cashout':
        audio.src = '/sounds/cashout.mp3';
        break;
    }
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, [soundEnabled]);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('round:started', async (data: any) => {
      if (!data?.id) {
        console.error('Invalid round:started event:', data);
        return;
      }
      
      hasAutoBetPlaced.current = false;
      hasAutoCashedOut.current = false;
      
      setCurrentRound({
        id: data.id,
        status: data.status as 'BETTING' | 'RUNNING' | 'ENDED',
        crashPoint: data.crashPoint ? parseFloat(data.crashPoint) : null,
        hash: data.hash || '',
        seed: data.seed || '',
        startedAt: data.startedAt || new Date().toISOString(),
        crashedAt: data.crashedAt,
        settledAt: data.settledAt,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        bets: data.bets || [],
      });
      
      setMultiplier(1.0);
      setCrashPoint(null);
      playSound('bet');
      
      const store = useGameStore.getState();
      if (store.autoBetEnabled && store.autoBetAmount && !hasAutoBetPlaced.current) {
        console.log(`[Auto-bet] Placing bet of ${store.autoBetAmount} for new round ${data.id}`);
        hasAutoBetPlaced.current = true;
        try {
          const bet = await placeBet(data.id, store.autoBetAmount);
          addBet(bet);
          console.log(`[Auto-bet] Bet placed successfully`);
        } catch (error) {
          console.error('[Auto-bet] Failed to place bet:', error);
          hasAutoBetPlaced.current = false;
        }
      }
    });

     socket.on('multiplier:update', async (data: any) => {
       console.log('[WS] multiplier:update received:', data);
       if (data?.multiplier !== undefined) {
         const multiplier = parseFloat(data.multiplier);
         setMultiplier(multiplier);
       }
       
       const store = useGameStore.getState();
       const currentAutoCashout = store.autoCashout;
       const currentMyBets = store.myBets;
       const currentRoundId = store.currentRound?.id;
       
       if (currentAutoCashout && currentRoundId) {
         const myPendingBet = currentMyBets.find(
           (b) => b.roundId === currentRoundId && b.status === 'PENDING'
         );
         
         if (myPendingBet && multiplier >= currentAutoCashout && !hasAutoCashedOut.current) {
           hasAutoCashedOut.current = true;
           console.log(`[Auto-cashout] Triggering cashout at ${multiplier}x (target: ${currentAutoCashout}x) for bet ${myPendingBet.id}`);
           try {
             const result = await cashout(currentRoundId);
             if (result?.betId) {
               console.log(`[Auto-cashout] Updating bet ${result.betId} to CASHED_OUT with multiplier ${result.cashoutMultiplier}`);
               updateBet({
                 id: result.betId,
                 roundId: currentRoundId,
                 playerId: myPendingBet.playerId,
                 amount: myPendingBet.amount,
                 status: 'CASHED_OUT',
                 cashoutMultiplier: parseFloat(result.cashoutMultiplier),
                 cashoutedAt: new Date().toISOString(),
                 createdAt: myPendingBet.createdAt,
                 updatedAt: new Date().toISOString(),
               });
               playSound('cashout');
               console.log(`[Auto-cashout] Success at ${multiplier}x, profit: ${result?.profit}`);
             } else {
               console.error('[Auto-cashout] No betId in response:', result);
               hasAutoCashedOut.current = false;
             }
           } catch (error) {
             hasAutoCashedOut.current = false;
             console.error('[Auto-cashout] Failed:', error);
           }
         }
       }
     });

    socket.on('round:crashed', (data: any) => {
      if (data?.crashPoint !== undefined) {
        const crashPoint = parseFloat(data.crashPoint);
        setCrashPoint(crashPoint);
        setMultiplier(crashPoint);
        
        const store = useGameStore.getState();
        const currentRound = store.currentRound;
        if (currentRound) {
          setCurrentRound({
            ...currentRound,
            status: 'ENDED',
            crashPoint: crashPoint,
            crashedAt: new Date().toISOString(),
          });
        }
        
        const roundId = store.currentRound?.id;
        if (roundId) {
          const pendingBet = store.myBets.find((b) => b.roundId === roundId && b.status === 'PENDING');
          if (pendingBet) {
            updateBet({
              ...pendingBet,
              status: 'LOST',
            });
          }
        }
        
        playSound('crash');
      }
    });

    socket.on('bet:placed', (data: any) => {
      if (!data) return;
      const bet: any = {
        id: crypto.randomUUID(),
        roundId: data.roundId,
        playerId: data.playerId,
        amount: data.amount,
        status: 'PENDING',
        cashoutMultiplier: null,
        cashoutedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addBet(bet);
      playSound('bet');
    });

    socket.on('bet:cashed_out', (data: any) => {
      if (!data) return;
      const bet: any = {
        id: data.betId,
        roundId: data.roundId,
        playerId: data.playerId,
        amount: 0,
        status: 'CASHED_OUT',
        cashoutMultiplier: parseFloat(data.multiplier),
        cashoutedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateBet(bet);
      playSound('cashout');
    });

    socket.on('round:settled', async (data: any) => {
      if (data?.crashPoint !== undefined) {
        addRoundHistory({
          id: data.roundId || crypto.randomUUID(),
          crashPoint: parseFloat(data.crashPoint),
          timestamp: new Date().toISOString(),
        });
      }
      setCurrentRound(null);
      setMultiplier(1.0);
      setCrashPoint(null);
      setBettingEndsAt(null);
      
      setTimeout(async () => {
        try {
          const newRound = await getCurrentRound();
          if (newRound && newRound.status === 'BETTING') {
            const createdAt = new Date(newRound.createdAt).getTime();
            setBettingEndsAt(createdAt + 10000);
            setCurrentRound(newRound);
            console.log('[WS] New BETTING phase round fetched:', newRound.id);
            
            const store = useGameStore.getState();
            if (store.autoBetEnabled && store.autoBetAmount) {
              console.log(`[Auto-bet] Placing bet of ${store.autoBetAmount} for new betting round ${newRound.id}`);
              try {
                const bet = await placeBet(newRound.id, store.autoBetAmount);
                addBet(bet);
                console.log(`[Auto-bet] Bet placed successfully`);
              } catch (error) {
                console.error('[Auto-bet] Failed to place bet:', error);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch new round after settlement:', error);
        }
      }, 3000);
    });

    socket.on('betting:ended', () => {
      console.log('[WS] betting:ended event received - betting has ended');
    });

    socket.on('error', (err: any) => {
      console.error('WebSocket error:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    setCurrentRound,
    setCrashPoint,
    setMultiplier,
    addBet,
    updateBet,
    playSound,
    addRoundHistory,
    setBettingEndsAt,
  ]);

  return { socket: socketRef.current, isConnected };
}
