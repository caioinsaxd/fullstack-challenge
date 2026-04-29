import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { placeBet, cashout, cancelBet } from '../services/api';

type BetPhase = 'none' | 'betting' | 'cashed' | 'lost';

export function BetPanel() {
  const [betAmount, setBetAmount] = useState(100);
  const [phase, setPhase] = useState<BetPhase>('none');
  const [placedAmount, setPlacedAmount] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundsRemaining, setRoundsRemaining] = useState(0);
  
  const { currentRound, multiplier, myBets, autoCashout, autoBetEnabled, autoBetAmount, autoBetRounds, setAutoCashout, setAutoBetEnabled, setAutoBetAmount, setAutoBetRounds, addBet, updateBet, removeBet } = useGameStore();

  const roundId = currentRound?.id;
  const roundStatus = currentRound?.status;
  const isBetting = roundStatus === 'BETTING';
  const isRunning = roundStatus === 'RUNNING';
  const isEnded = roundStatus === 'ENDED';

  const canPlace = isBetting && phase === 'none';

  const autoCashoutDoneRef = useRef(false);

  useEffect(() => {
    if (autoBetEnabled && autoBetAmount && autoBetRounds > 0 && phase === 'none') {
      setRoundsRemaining(autoBetRounds);
    }
    if (!autoBetEnabled) {
      setRoundsRemaining(0);
    }
  }, [autoBetEnabled, autoBetRounds]);

  useEffect(() => {
    if (!roundId) return;
    
    const existing = myBets.find(b => b.roundId === roundId);
    if (existing) {
      if (existing.status === 'PENDING') {
        setPhase('betting');
        setPlacedAmount(existing.amount);
        autoCashoutDoneRef.current = false;
      } else if (existing.status === 'CASHED_OUT') {
        setPhase('cashed');
        setPlacedAmount(existing.amount);
        setWinAmount(existing.cashoutMultiplier ? Math.round(existing.amount * (Number(existing.cashoutMultiplier) - 1)) : 0);
        autoCashoutDoneRef.current = true;
      } else if (existing.status === 'LOST') {
        setPhase('lost');
        setPlacedAmount(existing.amount);
        autoCashoutDoneRef.current = true;
      }
    } else if (isBetting) {
      setPhase('none');
      setPlacedAmount(0);
      setWinAmount(0);
      autoCashoutDoneRef.current = false;
    }
  }, [roundId, JSON.stringify(myBets), isBetting]);

  // Detect crash
  useEffect(() => {
    if (isEnded && phase === 'betting' && placedAmount > 0) {
      const existing = myBets.find(b => b.roundId === roundId);
      if (existing && existing.status !== 'CASHED_OUT') {
        setPhase('lost');
      }
    }
  }, [isEnded, phase, placedAmount, roundId, JSON.stringify(myBets)]);

  // Reset when new betting round starts
  useEffect(() => {
    if (isBetting && phase !== 'none' && phase !== 'betting') {
      setPhase('none');
      setPlacedAmount(0);
      setWinAmount(0);
      autoCashoutDoneRef.current = false;
    }
  }, [roundId]);

// Auto-bet: place bet when rounds remaining and in betting phase
  useEffect(() => {
    if (!currentRound?.id || !isBetting || phase !== 'none') return;
    if (autoBetEnabled && autoBetAmount && roundsRemaining > 0) {
      handlePlace();
    }
  }, [currentRound?.id, isBetting, roundsRemaining, autoBetEnabled, autoBetAmount]);

  // Decrement rounds after round ends
  useEffect(() => {
    if (isEnded && (phase === 'cashed' || phase === 'lost')) {
      const newRounds = Math.max(0, roundsRemaining - 1);
      setRoundsRemaining(newRounds);
      if (newRounds === 0) {
        setAutoBetEnabled(false);
      }
    }
  }, [isEnded, phase]);

  const handlePlace = useCallback(async () => {
    if (!currentRound || phase !== 'none') return;
    
    const amountToBet = autoBetEnabled && autoBetAmount ? autoBetAmount : betAmount;
    if (amountToBet <= 0) return;
    
    const amountInCents = Math.round(amountToBet * 100);
    
    setIsPlacing(true);
    setError(null);
    
    try {
      const bet = await placeBet(currentRound.id, amountInCents);
      addBet(bet);
      setPhase('betting');
      setPlacedAmount(bet.amount);
    } catch (err: any) {
      console.error('Place bet error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setIsPlacing(false);
    }
  }, [currentRound, phase, betAmount, autoBetEnabled, autoBetAmount]);

  const handleCashout = useCallback(async () => {
    if (!currentRound) return;
    
    if (phase === 'betting' && isBetting) {
      const existing = myBets.find(b => b.roundId === currentRound.id);
      try {
        await cancelBet(currentRound.id);
        if (existing) {
          removeBet(existing.id);
        }
        setPhase('none');
        setPlacedAmount(0);
      } catch (err: any) {
        console.error('Cancel error:', err.response?.data || err.message);
      }
      return;
    }
    
    if (phase !== 'betting') return;
    
    setIsCashingOut(true);
    setError(null);
    
    try {
      const result = await cashout(currentRound.id);
      
      updateBet({
        id: result.betId,
        roundId: currentRound.id,
        playerId: '',
        amount: placedAmount,
        status: 'CASHED_OUT',
        cashoutMultiplier: parseFloat(result.cashoutMultiplier),
        cashoutedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      setPhase('cashed');
      setWinAmount(result.profit);
      autoCashoutDoneRef.current = true;
    } catch (err: any) {
      console.error('Cashout error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setIsCashingOut(false);
    }
  }, [currentRound, phase, placedAmount]);

  useEffect(() => {
    if (!autoCashout || phase !== 'betting' || isEnded || autoCashoutDoneRef.current) return;
    
    if (multiplier >= autoCashout) {
      autoCashoutDoneRef.current = true;
      handleCashout();
    }
  }, [multiplier, autoCashout, phase, isEnded]);

  const getButtonText = () => {
    if (isPlacing) return 'PLACING...';
    if (isCashingOut) return 'CASHING...';
    if (phase === 'cashed') return `✅ CASHED! +$${(winAmount / 100).toFixed(2)}`;
    if (phase === 'lost') return `💥 CRASHED! -$${(placedAmount / 100).toFixed(2)}`;
    if (phase === 'betting' && isEnded) return `💥 CRASHED! -$${(placedAmount / 100).toFixed(2)}`;
    if (phase === 'none') return 'NO BET';
    if (phase === 'betting' && isBetting) return 'CANCEL';
    if (phase === 'betting' && isRunning) return `CASH OUT @ ${multiplier.toFixed(2)}x`;
    return 'WAIT...';
  };

  const getButtonColor = () => {
    if (phase === 'cashed') return '#10b981';
    if (phase === 'lost' || (phase === 'betting' && isEnded)) return '#dc2626';
    if (phase === 'betting' && isBetting) return '#dc2626';
    if (phase === 'betting' && isRunning) return '#f59e0b';
    return '#4b5563';
  };

  const presetAmounts = [1, 2, 5, 10, 20]; // in dollars

  const isPlaceDisabled = !canPlace || isPlacing;
  const isCashoutDisabled = (phase !== 'betting') || isCashingOut;

  return (
    <div className="panel" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontFamily: 'Orbitron', fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
        MISSION CONTROL
      </h3>
      
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.2)', padding: '0.5rem', marginBottom: '0.5rem', color: '#fca5a5', fontSize: '0.75rem' }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>BET AMOUNT</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {presetAmounts.map(amt => (
            <button 
              key={amt} 
              onClick={() => setBetAmount(amt)} 
              disabled={!canPlace}
              style={{ 
                flex: 1, 
                padding: '0.5rem', 
                background: betAmount === amt ? '#10b981' : '#334155', 
                border: 'none', 
                borderRadius: '0.25rem', 
                color: '#fff',
                cursor: canPlace ? 'pointer' : 'not-allowed',
                opacity: canPlace ? 1 : 0.5,
              }}
            >
              ${amt}
            </button>
          ))}
        </div>
        <input 
          type="number" 
          value={betAmount} 
          onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))} 
          disabled={!canPlace}
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            background: '#1e293b', 
            border: '1px solid #334155', 
            color: '#fff', 
            borderRadius: '0.25rem',
            cursor: canPlace ? 'text' : 'not-allowed',
          }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {!autoBetEnabled && (
          <button 
            onClick={handlePlace} 
            disabled={isPlaceDisabled}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              background: !isPlaceDisabled ? '#10b981' : '#4b5563', 
              border: 'none', 
              borderRadius: '0.5rem', 
              color: '#fff', 
              fontWeight: 600,
              cursor: isPlaceDisabled ? 'not-allowed' : 'pointer',
              opacity: isPlaceDisabled ? 0.6 : 1,
            }}
          >
            {isPlacing ? 'PLACING...' : 'LAUNCH MISSION'}
          </button>
        )}
        
        <button 
          onClick={handleCashout} 
          disabled={isCashoutDisabled}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            background: getButtonColor(), 
            border: 'none', 
            borderRadius: '0.5rem', 
            color: '#fff', 
            fontWeight: 600, 
            cursor: isCashoutDisabled ? 'not-allowed' : 'pointer',
            opacity: isCashoutDisabled ? 0.6 : 1,
          }}
        >
          {getButtonText()}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            AUTO CASHOUT
            <span title="Minimum: 1.35x" style={{ cursor: 'help', color: '#64748b' }}>ⓘ</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="number" 
              value={autoCashout || ''} 
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (val === null || val >= 1.35) {
                  setAutoCashout(val);
                }
              }} 
              placeholder="1.35"
              step="0.01"
              min={1.35}
              style={{ 
                width: '4rem', 
                padding: '0.25rem', 
                background: '#1e293b', 
                border: '1px solid #334155', 
                color: '#fff', 
                borderRadius: '0.25rem',
              }} 
            />
            <div 
              onClick={() => setAutoCashout(autoCashout ? null : 1.35)}
              style={{ 
                width: '2.5rem', 
                height: '1.25rem', 
                background: autoCashout ? '#10b981' : '#4b5563', 
                borderRadius: '1rem',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }} 
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: autoCashout ? '1.35rem' : '2px',
                width: '1rem',
                height: '1rem',
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>AUTO BET</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input 
                type="number" 
                value={autoBetAmount || ''} 
                onChange={e => setAutoBetAmount(e.target.value ? Number(e.target.value) : null)} 
                placeholder="1"
                min={1}
                style={{ 
                  width: '3.5rem', 
                  padding: '0.25rem', 
                  background: '#1e293b', 
                  border: '1px solid #334155', 
                  color: '#fff', 
                  borderRadius: '0.25rem',
                }} 
              />
              <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.1rem' }}>$</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>x</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input 
                type="number" 
                value={autoBetRounds || ''} 
                onChange={e => setAutoBetRounds(Math.max(1, Number(e.target.value) || 1))} 
                placeholder="1"
                min={1}
                style={{ 
                  width: '3rem', 
                  padding: '0.25rem', 
                  background: '#1e293b', 
                  border: '1px solid #334155', 
                  color: '#fff', 
                  borderRadius: '0.25rem',
                }} 
              />
              <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.1rem' }}>rounds</span>
            </div>
            <div 
              onClick={() => {
                const newEnabled = !autoBetEnabled;
                setAutoBetEnabled(newEnabled);
                if (newEnabled && autoBetRounds > 0) {
                  setRoundsRemaining(autoBetRounds);
                }
              }}
              style={{ 
                width: '2.5rem', 
                height: '1.25rem', 
                background: autoBetEnabled ? '#10b981' : '#4b5563', 
                borderRadius: '1rem',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }} 
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: autoBetEnabled ? '1.35rem' : '2px',
                width: '1rem',
                height: '1rem',
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        </div>
        
        {autoBetEnabled && roundsRemaining > 0 && (
          <div style={{ fontSize: '0.7rem', color: '#10b981', textAlign: 'center', marginTop: '0.5rem' }}>
            {roundsRemaining} round{roundsRemaining !== 1 ? 's' : ''} remaining
          </div>
        )}
      </div>
    </div>
  );
}