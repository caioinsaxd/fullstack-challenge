import { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CrashChart } from './components/CrashChart';
import { BetPanel } from './components/BetPanel';
import { MissionHistory } from './components/MissionHistory';
import { SeedVerificationPanel } from './components/SeedVerificationPanel';
import { SpaceBackground } from './components/SpaceBackground';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameStore } from './stores/gameStore';
import { useAuthStore, getAuthorizationUrl, exchangeCodeForToken } from './stores/authStore';
import { getRoundHistory, getCurrentRound, setAuthToken } from './services/api';

const queryClient = new QueryClient();

const PANEL_WIDTH = 280;

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = await getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start login:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <SpaceBackground />
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '1rem',
          padding: '3rem',
          maxWidth: '400px',
          width: '100%',
          border: '1px solid rgba(30, 41, 59, 0.8)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.5rem',
            fontFamily: 'Orbitron, sans-serif',
            textAlign: 'center',
          }}>
            CRASH ORBIT
          </h1>
          <p style={{
            color: '#9ca3af',
            textAlign: 'center',
            marginBottom: '2rem',
          }}>
            Sign in to play
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              background: isLoading ? '#374151' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Loading...' : 'Sign In'}
          </button>
        </div>
      </div>
    </>
  );
}

function CallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  
  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = localStorage.getItem('oauth_state');
      
      if (!code) {
        setError('No authorization code received');
        return;
      }
      
      if (state !== storedState) {
        setError('Invalid state - possible CSRF attack');
        return;
      }
      
      try {
        const tokens = await exchangeCodeForToken(code);
        setAuth(tokens.token, tokens.userId, tokens.username, tokens.email);
        setAuthToken(tokens.token);
        
        // Clear OAuth params and redirect to main page
        window.history.replaceState({}, '', '/');
      } catch (err) {
        console.error('Token exchange failed:', err);
        setError('Failed to complete login');
      }
    };
    
    processCallback();
  }, [setAuth]);
  
  return (
    <>
      <SpaceBackground />
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        {error ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Login Failed</h2>
            <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>{error}</p>
            <a
              href="/"
              style={{
                color: '#10b981',
                textDecoration: 'none',
              }}
            >
              Try again
            </a>
          </div>
        ) : (
          <div style={{
            color: '#10b981',
            fontSize: '1.25rem',
          }}>
            Logging in...
          </div>
        )}
      </div>
    </>
  );
}

function Game() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);
  
  useWebSocket();
  const { setHistory, setCurrentRound, setIsLoading, error, setError } = useGameStore();
  const { user, logout: authLogout } = useAuthStore();
  
  const handleLogout = () => {
    authLogout();
    window.location.href = '/';
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [current, history] = await Promise.all([
          getCurrentRound(),
          getRoundHistory(),
        ]);
        setCurrentRound(current);
        setHistory(history);
        
        // If current round is in BETTING phase, set the betting timer
        if (current && current.status === 'BETTING') {
          const { setBettingEndsAt } = useGameStore.getState();
          setBettingEndsAt(Date.now() + 10000);
        }
      } catch (err: any) {
        setError('Failed to load game data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setCurrentRound, setHistory, setIsLoading, setError]);

  if (error) {
    return (
      <>
        <SpaceBackground />
        <div style={{ 
          position: 'relative', 
          zIndex: 10,
          padding: '2rem', 
          background: 'rgba(15, 23, 42, 0.9)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1 style={{ color: '#ef4444', fontFamily: 'Orbitron, sans-serif' }}>Error</h1>
          <p style={{ color: '#9ca3af' }}>{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SpaceBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <header className="header" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ 
            maxWidth: '80rem',
            margin: '0 auto',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'Orbitron, sans-serif' }}>CRASH ORBIT</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                  }}>
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{user.username}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  borderRadius: '0.375rem',
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main content container */}
        <div 
          ref={mainRef}
          style={{
            position: 'relative',
            maxWidth: '80rem',
            margin: '0 auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <CrashChart />
          <BetPanel />
          <SeedVerificationPanel />
        </div>

        {/* Mission History Panel - positioned relative to main content */}
        <div 
          style={{
            position: 'absolute',
            left: 0,
            top: '60px',
            height: mainRef.current ? `${mainRef.current.offsetHeight - 40}px` : 'calc(100vh - 100px)',
            width: `${PANEL_WIDTH}px`,
            transform: isHistoryOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 15,
            pointerEvents: isHistoryOpen ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <MissionHistory />
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          style={{
            position: 'absolute',
            left: isHistoryOpen ? `${PANEL_WIDTH - 2}px` : 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '2rem',
            height: '4rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(30, 41, 59, 0.6)',
            borderLeft: isHistoryOpen ? 'none' : '1px solid rgba(30, 41, 59, 0.6)',
            borderRadius: isHistoryOpen ? '0 0.5rem 0.5rem 0' : '0 0.5rem 0.5rem 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-label={isHistoryOpen ? 'Hide mission history' : 'Show mission history'}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none"
            style={{
              transform: isHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <path d="M9 18L15 12L9 5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </>
  );
}

function App() {
  const { isAuthenticated, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if we're on callback page
    if (window.location.pathname === '/callback') {
      setIsLoading(false);
      return;
    }
    
    // If we have a token, set it in the API
    if (token) {
      setAuthToken(token);
    }
    setIsLoading(false);
  }, [token]);
  
  if (isLoading) {
    return (
      <>
        <SpaceBackground />
        <div style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ color: '#10b981', fontSize: '1.25rem' }}>Loading...</div>
        </div>
      </>
    );
  }
  
  // Handle callback page
  if (window.location.pathname === '/callback') {
    return (
      <QueryClientProvider client={queryClient}>
        <CallbackPage />
      </QueryClientProvider>
    );
  }
  
  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <Game />
    </QueryClientProvider>
  );
}

export default App;