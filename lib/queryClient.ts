"use client";

import { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient | undefined;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          gcTime: 5 * 60 * 1000,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}

export function getPersister() {
  if (typeof window === 'undefined') return null;
  return {
    storage: window.localStorage,
    key: 'TANSTACK_QUERY_CACHE',
  };
}
