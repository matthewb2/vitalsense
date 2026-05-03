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
  checkAuth: () => void;
}

// 토큰이 만료되었는지 확인하는 함수
const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1]; // Payload 부분 추출
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    const now = Math.floor(Date.now() / 1000); // 현재 시간 (초 단위)
    return payload.exp < now; // 만료 시간이 현재보다 작으면 true
  } catch (e) {
    return true; // 에러 발생 시 만료된 것으로 간주
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ // get 추가
      user: null,
      isLoggedIn: false,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      logout: () => {
        set({ user: null, isLoggedIn: false });
        localStorage.removeItem('auth-storage');
      },
      checkAuth: () => {
        const { user, logout } = get();
        const token = user?.accessToken || user?.token?.accessToken;

        if (token) {
          if (isTokenExpired(token)) {
            console.log('토큰이 만료되었습니다. 로그아웃 처리합니다.');
            logout(); // 만료되었으면 스토어 청소
          } else {
            set({ isLoggedIn: true }); // 유효하면 로그인 유지
          }
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