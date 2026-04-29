import { useGameStore } from '../stores/gameStore';
import type { HistoryEntry } from '../types';

function calculateProfit(bet: { amount: number; cashoutMultiplier: number | null; status: string }): number {
  if (bet.status === 'CASHED_OUT' && bet.cashoutMultiplier) {
    return Math.round(bet.amount * bet.cashoutMultiplier - bet.amount);
  }
  if (bet.status === 'LOST') {
    return -bet.amount;
  }
  return 0;
}

function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMultiplier(value: number): string {
  if (value >= 1000) {
    return value.toFixed(0) + 'x';
  }
  return value.toFixed(2) + 'x';
}

export function MissionHistory() {
  const { myBets, roundHistory } = useGameStore();
  
  const pendingBets = myBets.filter((b) => b.status === 'PENDING');
  const settledBets = myBets.filter((b) => b.status !== 'PENDING').slice(0, 10);

  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
        borderRight: '1px solid rgba(30, 41, 59, 0.6)',
        borderRadius: '0 0.5rem 0.5rem 0',
        padding: '1rem',
        overflow: 'hidden',
      }}
    >
      <h3 style={{ 
        fontFamily: 'Orbitron, sans-serif', 
        fontSize: '0.875rem', 
        color: '#fff', 
        marginBottom: '1rem', 
        margin: '0 0 1rem 0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path 
            d="M22 11.08V12a10 10 0 11-5.93-9.14" 
            stroke="#10b981" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M22 4L12 14.01l-3-3" 
            stroke="#10b981" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        MISSION HISTORY
      </h3>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
      }}>
        <style>{`
          .history-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .history-scroll::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.3);
            border-radius: 2px;
          }
          .history-scroll::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.5);
            border-radius: 2px;
          }
        `}</style>

        {roundHistory.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.625rem', 
              color: '#94a3b8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              marginBottom: '0.5rem',
            }}>
              Past Rounds
            </div>
            {roundHistory.map((entry: HistoryEntry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.375rem 0.5rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '0.375rem',
                  marginBottom: '0.25rem',
                }}
              >
                <span style={{ color: '#6b7280', fontSize: '0.625rem', fontFamily: 'monospace' }}>
                  {formatTime(entry.timestamp)}
                </span>
                <span style={{ 
                  color: entry.crashPoint >= 2.00 ? '#10b981' : entry.crashPoint >= 1.35 ? '#f59e0b' : '#ef4444',
                  fontWeight: 600,
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '0.75rem',
                }}>
                  {formatMultiplier(entry.crashPoint)}
                </span>
              </div>
            ))}
          </div>
        )}

        {settledBets.length > 0 && (
          <div>
            <div style={{ 
              fontSize: '0.625rem', 
              color: '#94a3b8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              marginBottom: '0.5rem',
            }}>
              Completed
            </div>
            {settledBets.map((bet) => {
              const profit = calculateProfit(bet);
              return (
                <div
                  key={bet.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '0.375rem',
                    marginBottom: '0.375rem',
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    {bet.status === 'CASHED_OUT' ? 'SUCCESS' : 'FAILED'}
                  </span>
                  <span style={{ 
                    color: profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : '#fff',
                    fontWeight: 600,
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.75rem',
                  }}>
                    {profit > 0 ? '+' : ''}{profit}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {pendingBets.length === 0 && settledBets.length === 0 && roundHistory.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center' }}>
            No missions yet
          </p>
        )}
      </div>
    </div>
  );
}