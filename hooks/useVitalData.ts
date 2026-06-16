import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const API_URL = '/api/posts';

const parseExtra = (item: any) => {
  if (typeof item.extra === 'string') {
    try { return JSON.parse(item.extra); } catch { return {}; }
  }
  return item.extra || {};
};

const getToken = () => {
  const { user } = useAuthStore.getState();
  return user?.accessToken || user?.token?.accessToken;
};

const buildHeaders = () => {
  const token = getToken();
  const headers: Record<string, string> = { 'client-id': 'vitalsense' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export function useVitalData(type: string) {
  const { user, isLoggedIn } = useAuthStore();
  const userId = user?._id;

  return useQuery({
    queryKey: ['vitals', type, userId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}?type=${type}`, { headers: buildHeaders() });
      const data = await response.json();
      if (!data.ok || !data.item) return [];

      const filtered = data.item.filter((item: any) => {
        const ex = parseExtra(item);
        return ex.userId === userId || item.user?._id === userId;
      });

      return filtered.sort((a: any, b: any) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime());
    },
    enabled: !!userId && isLoggedIn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateVital(type: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { title: string; content: string; image?: string | null; extra?: Record<string, any> }) => {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({ type, ...data, extra: { userId: user?._id, userName: user?.name, ...data.extra } }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', type] });
    },
  });
}

export function useDeleteVital(type: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', type] });
    },
  });
}

export function useUpdateVital(type: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; image?: string | null; extra?: Record<string, any> }) => {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({ type, ...data }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', type] });
    },
  });
}
