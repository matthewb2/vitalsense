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
    userId?: number | string;
  };
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// 토큰이 만료되었는지 확인하는 함수
const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      logout: () => {
        set({ user: null, isLoggedIn: false });
      },
      refreshToken: async () => {
        const { user, logout } = get();
        const refreshToken = user?.token?.refreshToken;
        
        if (!refreshToken) {
          console.log('refreshToken이 없습니다.');
          logout();
          return false;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-id': 'vitalsense',
            },
            body: JSON.stringify({ refreshToken }),
          });
          
          const data = await response.json();
          
          if (data.ok && data.item?.token?.accessToken) {
            const updatedUser = {
              ...user,
              token: {
                ...user?.token,
                accessToken: data.item.token.accessToken,
                refreshToken: data.item.token.refreshToken || refreshToken,
              },
              accessToken: data.item.token.accessToken,
            };
            set({ user: updatedUser, isLoggedIn: true });
            console.log('토큰 갱신 성공');
            return true;
          } else {
            console.log('토큰 갱신 실패:', data.message);
            logout();
            return false;
          }
        } catch (err) {
          console.error('토큰 갱신 오류:', err);
          logout();
          return false;
        }
      },
      checkAuth: async () => {
        const { user, logout, refreshToken } = get();
        const accessToken = user?.accessToken || user?.token?.accessToken;

        if (accessToken) {
          if (isTokenExpired(accessToken)) {
            console.log('accessToken이 만료되었습니다. refresh 시도...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              console.log('refresh 실패, 로그아웃 처리');
            }
          } else {
            set({ isLoggedIn: true });
          }
        } else if (user?.token?.refreshToken) {
          console.log('accessToken이 없고 refreshToken만 있습니다. 갱신 시도...');
          await refreshToken();
        } else {
          set({ isLoggedIn: false });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);