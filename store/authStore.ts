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
        const userStr = localStorage.getItem('user');
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
          try {
            const user = JSON.parse(userStr);
            set({ user, isLoggedIn: true });
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