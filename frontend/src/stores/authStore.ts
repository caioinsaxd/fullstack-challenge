import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  email: string | null;
  balance: number; // in cents
  isAuthenticated: boolean;
  user: { username: string; email: string } | null;
  
  setAuth: (token: string, userId: string, username: string, email: string) => void;
  setBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      email: null,
      balance: 0,
      isAuthenticated: false,
      user: null,
      
      setAuth: (token, userId, username, email) => set({
        token,
        userId,
        username,
        email,
        isAuthenticated: true,
        user: { username, email },
      }),
      
      setBalance: (balance) => set({ balance }),
      
      logout: () => set({
        token: null,
        userId: null,
        username: null,
        email: null,
        balance: 0,
        isAuthenticated: false,
        user: null,
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080/realms/crash-game';
const CLIENT_ID = 'crash-game-client';
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173';

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function getAuthorizationUrl(): Promise<string> {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  localStorage.setItem('oauth_code_verifier', codeVerifier);
  localStorage.setItem('oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${REDIRECT_URI}/callback`,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  return `${KEYCLOAK_URL}/protocol/openid-connect/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{ token: string; userId: string; username: string; email: string }> {
  const codeVerifier = localStorage.getItem('oauth_code_verifier');
  
  const response = await fetch(`${KEYCLOAK_URL}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: `${REDIRECT_URI}/callback`,
      code_verifier: codeVerifier || '',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }
  
  const data = await response.json();
  
  const payload = JSON.parse(atob(data.access_token.split('.')[1]));
  
  return {
    token: data.access_token,
    userId: payload.sub,
    username: payload.preferred_username || payload.name || 'Player',
    email: payload.email || '',
  };
}

export function logout() {
  useAuthStore.getState().logout();
  localStorage.removeItem('oauth_code_verifier');
  localStorage.removeItem('oauth_state');
  
  window.location.href = `${KEYCLOAK_URL}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}