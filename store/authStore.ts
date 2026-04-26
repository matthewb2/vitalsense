import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: number;
  email: string;
  name: string;
  type: string;
  image?: string;
  accessToken?: string;
  token?: {
    accessToken?: string;
    refreshToken?: string;
  };
  extra?: {
    birthday?: string;
  };
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      setUser: (user) => {
        console.log('setUser called with:', user);
        set({ user, isLoggedIn: !!user });
      },
      logout: () => set({ user: null, isLoggedIn: false }),
      checkAuth: () => {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.state?.user) {
              set({ user: parsed.state.user, isLoggedIn: true });
            }
          } catch {
            set({ user: null, isLoggedIn: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);