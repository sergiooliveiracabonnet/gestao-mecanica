import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse } from '@oficina/contracts';
import { setAuthToken } from '@/lib/api/client';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserResponse | null;
  setSession: (session: Session) => void;
  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

// Tokens ficam em localStorage (via persist) — consistente com o contrato
// da API (tokens voltam no corpo JSON, não como cookie httpOnly).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => {
        setAuthToken(accessToken);
        set({ accessToken, refreshToken, user });
      },
      updateTokens: ({ accessToken, refreshToken }) => {
        setAuthToken(accessToken);
        set({ accessToken, refreshToken });
      },
      logout: () => {
        setAuthToken(null);
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'oficina-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAuthToken(state.accessToken);
        }
      },
    },
  ),
);
