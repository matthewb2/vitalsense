import { useAuthStore } from '@/store/authStore';

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  if (!skipAuth) {
    const { user, refreshToken } = useAuthStore.getState();
    const token = user?.accessToken || user?.token?.accessToken;

    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const { user: updatedUser } = useAuthStore.getState();
        const newToken = updatedUser?.accessToken || updatedUser?.token?.accessToken;
        if (newToken) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Authorization': `Bearer ${newToken}`,
          };
        }
        return fetch(url, fetchOptions);
      }
    }

    return response;
  }

  return fetch(url, fetchOptions);
}
