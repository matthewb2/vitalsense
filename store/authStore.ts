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
    hiddenNewsIds?: string[];
    providerAccountId?: string;
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

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.debug('[Auth] Token is not a JWT, assuming valid');
      return false;
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    const now = Math.floor(Date.now() / 1000);
    const expired = payload.exp < now;
    console.debug('[Auth] JWT exp check:', new Date(payload.exp * 1000).toISOString(), 'now:', new Date(now * 1000).toISOString(), 'expired:', expired);
    return expired;
  } catch (e) {
    console.debug('[Auth] Token parse error, assuming valid');
    return false;
  }
};

const getTokenExpiry = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return payload.exp || null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      setUser: (user) => {
        console.debug('[Auth] setUser:', user ? `{_id: ${user._id}, name: ${user.name}, hasAccess: ${!!user.accessToken || !!user.token?.accessToken}, hasRefresh: ${!!user.token?.refreshToken}}` : 'null');
        set({ user, isLoggedIn: !!user });
        if (user) scheduleRefresh();
      },
      logout: () => {
        console.debug('[Auth] logout');
        clearRefreshTimer();
        set({ user: null, isLoggedIn: false });
      },
      refreshToken: async () => {
        const { user, logout } = get();
        const refreshToken = user?.token?.refreshToken;

        console.debug('[Auth] refreshToken called', {
          hasRefreshToken: !!refreshToken,
        });

        if (!refreshToken) {
          console.debug('[Auth] refreshToken 없음, 로그아웃');
          logout();
          return false;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'GET',
            headers: {
              'client-id': 'vitalsense',
              'Authorization': `Bearer ${refreshToken}`,
            },
          });

          const data = await response.json();
          console.debug('[Auth] Refresh API response:', data);

          if (data.ok && data.accessToken) {
            const updatedUser = {
              ...user,
              token: {
                ...user?.token,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || refreshToken,
              },
              accessToken: data.accessToken,
            };
            set({ user: updatedUser, isLoggedIn: true });
            console.debug('[Auth] 토큰 갱신 성공');
            scheduleRefresh();
            return true;
          } else {
            console.debug('[Auth] 토큰 갱신 실패:', data.message);
            logout();
            return false;
          }
        } catch (err) {
          console.error('[Auth] 토큰 갱신 오류:', err);
          logout();
          return false;
        }
      },
      checkAuth: async () => {
        const { user, refreshToken } = get();
        const accessToken = user?.accessToken || user?.token?.accessToken;

        console.debug('[Auth] checkAuth:', {
          hasUser: !!user,
          userId: user?._id,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!user?.token?.refreshToken,
          isLoggedIn: get().isLoggedIn,
        });

        if (accessToken) {
          const expired = isTokenExpired(accessToken);
          if (expired) {
            console.debug('[Auth] accessToken 만료, refresh 시도...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              console.debug('[Auth] refresh 실패, 로그아웃');
            } else {
              scheduleRefresh();
            }
          } else {
            console.debug('[Auth] accessToken 유효, 로그인 유지');
            set({ isLoggedIn: true });
            scheduleRefresh();
          }
        } else if (user?.token?.refreshToken) {
          console.debug('[Auth] accessToken 없음, refreshToken으로 갱신 시도...');
          const refreshed = await refreshToken();
          if (refreshed) scheduleRefresh();
        } else {
          console.debug('[Auth] 사용자 정보 없음, 로그아웃 상태');
          set({ isLoggedIn: false });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleRefresh() {
  clearRefreshTimer();
  const { user } = useAuthStore.getState();
  const accessToken = user?.accessToken || user?.token?.accessToken;
  if (!accessToken) return;

  const exp = getTokenExpiry(accessToken);
  if (!exp) return;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = (exp - now) * 1000;
  const refreshAt = Math.max(expiresIn - 120000, 60000);

  console.debug('[Auth] Scheduling refresh in', Math.round(refreshAt / 1000), 'seconds (token expires in', Math.round(expiresIn / 1000), 'seconds)');

  refreshTimer = setTimeout(async () => {
    console.debug('[Auth] Scheduled refresh triggered');
    const { refreshToken } = useAuthStore.getState();
    await refreshToken();
  }, refreshAt);
}
