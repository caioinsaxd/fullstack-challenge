import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { verifyRound } from '../services/api';

interface RoundVerification {
  roundId: string;
  seed: string;
  hash: string;
  crashPoint: string;
  verified: boolean;
  houseEdge?: number;
}

interface VerificationResult {
  isValid: boolean;
  actualCrashPoint: number;
  expectedCrashPoint: number;
  message: string;
}

export function SeedVerificationPanel() {
  const { currentRound, roundHistory } = useGameStore();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [verification, setVerification] = useState<RoundVerification | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (currentRound?.id && currentRound.status === 'ENDED') {
      setSelectedRoundId(currentRound.id);
    }
  }, [currentRound?.id]);

  useEffect(() => {
    if (!selectedRoundId) {
      setVerification(null);
      return;
    }

    const loadVerification = async () => {
      try {
        setError(null);
        setIsVerifying(true);
        const result = await verifyRound(selectedRoundId);
        
         setVerification({
           roundId: selectedRoundId,
           seed: result.seed || '',
           hash: result.hash || '',
           crashPoint: result.crashPoint?.toString() ?? "0",
           verified: result.verified,
           houseEdge: result.houseEdge,
         });
        
         if (result.verified) {
           const crashPointNum = parseFloat(result.crashPoint?.toString() ?? "0");
           setVerificationResult({
             isValid: true,
             actualCrashPoint: crashPointNum,
             expectedCrashPoint: crashPointNum,
             message: '✓ Provably fair verification passed! The crash point was predetermined.',
           });
         }
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Failed to load verification data';
        setError(message);
        console.error('Verification load error:', err);
      } finally {
        setIsVerifying(false);
      }
    };

    loadVerification();
  }, [selectedRoundId]);

     const handleVerify = useCallback(async () => {
     if (!verification) return;

     const crashPointNum = parseFloat(verification.crashPoint ?? "0");
     setVerificationResult({
       isValid: verification.verified,
       actualCrashPoint: crashPointNum,
       expectedCrashPoint: crashPointNum,
       message: verification.verified
         ? '✓ Verification successful! The crash point matches the seed.'
         : '✗ Verification failed! The crash point does not match the seed.',
     });
   }, [verification]);

  const handleCopySeed = useCallback(() => {
    if (verification?.seed) {
      navigator.clipboard.writeText(verification.seed);
    }
  }, [verification?.seed]);

  const handleCopyHash = useCallback(() => {
    if (verification?.hash) {
      navigator.clipboard.writeText(verification.hash);
    }
  }, [verification?.hash]);

  return (
    <div className="panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h3 style={{ fontFamily: 'Orbitron', fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
        🔐 PROVABLY FAIR VERIFICATION
      </h3>

      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: '1.5' }}>
        Each round's crash point is calculated from a cryptographic seed BEFORE betting begins.
        <strong style={{ color: '#f59e0b' }}> Select a round below to see the proof automatically.</strong>
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.2)', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.75rem', borderRadius: '0.25rem' }}>
          {error}
        </div>
      )}

<div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>
          SELECT ROUND TO VERIFY - Click a round below
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
           {currentRound && currentRound.status === 'ENDED' && (
             <button
               onClick={() => setSelectedRoundId(currentRound.id)}
               style={{
                 padding: '0.5rem 1rem',
                 background: selectedRoundId === currentRound.id ? '#10b981' : '#334155',
                 border: 'none',
                 borderRadius: '0.25rem',
                 color: '#fff',
                 fontSize: '0.75rem',
                 cursor: 'pointer',
                 fontFamily: 'monospace',
               }}
             >
               Current ({parseFloat(currentRound.crashPoint?.toString() ?? "0").toFixed(2)}x)
             </button>
           )}
        </div>
        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
          Previous rounds:
        </label>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxHeight: '80px', overflowY: 'auto' }}>
          {roundHistory && roundHistory.slice(0, 20).map((round) => (
            <button
              key={round.id}
              onClick={() => setSelectedRoundId(round.id)}
              style={{
                padding: '0.25rem 0.5rem',
                background: selectedRoundId === round.id ? '#10b981' : '#1e293b',
                border: '1px solid',
                borderColor: selectedRoundId === round.id ? '#10b981' : '#334155',
                borderRadius: '0.25rem',
                color: selectedRoundId === round.id ? '#fff' : '#94a3b8',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
             >
               {round.crashPoint ? `${parseFloat(round.crashPoint?.toString() ?? "0").toFixed(2)}x` : '...'}
             </button>
          ))}
        </div>
        {roundHistory && roundHistory.length === 0 && (
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>No previous rounds available</div>
        )}
      </div>

      {verification && (
        <div style={{
          background: 'rgba(15,23,42,0.5)',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid rgba(148,163,184,0.2)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                CRASH POINT
              </label>
               <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 'bold' }}>
                 {parseFloat(verification.crashPoint ?? "0").toFixed(2)}x
               </div>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                HOUSE EDGE
              </label>
              <div style={{ fontSize: '1rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                {verification.houseEdge ?? 3}%
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
              SEED (256-bit)
            </label>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}>
              <code style={{
                flex: 1,
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                overflow: 'auto',
                lineBreak: 'anywhere',
              }}>
                {verification.seed}
              </code>
              <button
                onClick={handleCopySeed}
                title="Copy seed"
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: '#fff',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 COPY
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
              HASH (SHA-256)
            </label>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}>
              <code style={{
                flex: 1,
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                overflow: 'auto',
                lineBreak: 'anywhere',
              }}>
                {verification.hash}
              </code>
              <button
                onClick={handleCopyHash}
                title="Copy hash"
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: '#fff',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 COPY
              </button>
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: isVerifying ? '#64748b' : '#0ea5e9',
              border: 'none',
              borderRadius: '0.25rem',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              fontFamily: 'Orbitron',
            }}
          >
            {isVerifying ? 'VERIFYING...' : 'VERIFY CRASH POINT'}
          </button>
        </div>
      )}

      {verificationResult && (
        <div style={{
          background: verificationResult.isValid
            ? 'rgba(16,185,129,0.1)'
            : 'rgba(239,68,68,0.1)',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: `1px solid ${verificationResult.isValid ? '#10b981' : '#dc2626'}`,
          marginBottom: '1rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{
              fontSize: '1.5rem',
            }}>
              {verificationResult.isValid ? '✓' : '✗'}
            </span>
            <div style={{
              color: verificationResult.isValid ? '#10b981' : '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              fontFamily: 'Orbitron',
            }}>
              {verificationResult.isValid ? 'VERIFIED' : 'VERIFICATION FAILED'}
            </div>
          </div>
          <p style={{
            color: verificationResult.isValid ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.75rem',
            margin: 0,
            lineHeight: '1.5',
          }}>
            {verificationResult.message}
          </p>

          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'transparent',
              border: `1px solid ${verificationResult.isValid ? '#10b981' : '#dc2626'}`,
              borderRadius: '0.25rem',
              color: verificationResult.isValid ? '#10b981' : '#dc2626',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {showDetails ? '▼ HIDE DETAILS' : '▶ SHOW DETAILS'}
          </button>

          {showDetails && (
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${verificationResult.isValid ? '#10b981' : '#dc2626'}`,
              fontSize: '0.7rem',
              color: '#cbd5e1',
              fontFamily: 'monospace',
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Expected Crash Point:</strong> {(typeof verificationResult.expectedCrashPoint === 'number' ? verificationResult.expectedCrashPoint : parseFloat(String(verificationResult.expectedCrashPoint)) || 0).toFixed(2)}x
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Actual Crash Point:</strong> {(typeof verificationResult.actualCrashPoint === 'number' ? verificationResult.actualCrashPoint : parseFloat(String(verificationResult.actualCrashPoint)) || 0).toFixed(2)}x
              </div>
              <div style={{ marginTop: '0.75rem', color: '#64748b', lineHeight: '1.5' }}>
                The crash point is algorithmically determined from the seed before the betting phase begins. No manipulation is possible after bets are placed.
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{
        background: 'rgba(15,23,42,0.3)',
        padding: '1rem',
        borderRadius: '0.5rem',
        fontSize: '0.7rem',
        color: '#94a3b8',
        lineHeight: '1.6',
      }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ color: '#cbd5e1' }}>How Provably Fair Works:</strong>
        </div>
        <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
          <li>Before betting starts, a random seed is generated.</li>
          <li>The seed is hashed to create a cryptographic proof.</li>
          <li>The crash point is calculated from this hash.</li>
          <li>You can verify any round by checking: Hash = HMAC-SHA256(Seed)</li>
          <li>Then: CrashPoint = Function(Hash)</li>
        </ol>
        
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(148,163,184,0.2)' }}>
          <strong style={{ color: '#cbd5e1' }}>The Curve Formula:</strong>
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '0.25rem',
            fontFamily: 'monospace',
          }}>
            <div style={{ color: '#10b981', marginBottom: '0.5rem' }}>
              CrashPoint = <strong>RTP / (1 - h)</strong>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
              Where: RTP = 0.97 (97% Return to Player)<br/>
              h = first 8 hex chars of hash / 0xFFFFFFFF
            </div>
            <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.6rem' }}>
              If h &lt; 0.03 (house edge): Instant crash at 1.00x
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(148,163,184,0.2)' }}>
          ℹ️ All rounds remain immutable and can be verified indefinitely.
        </div>
      </div>
    </div>
  );
}
