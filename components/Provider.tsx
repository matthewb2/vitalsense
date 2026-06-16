"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={getQueryClient()}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
