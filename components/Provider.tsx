"use client";

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient, getPersister } from '@/lib/queryClient';

export default function Provider({ children }: { children: React.ReactNode }) {
  const persister = getPersister();
  const client = getQueryClient();

  // 💡 핵심 방어 코드: persister가 존재하더라도 restoreClient 메서드가 없으면 
  // 에러를 던지는 대신 안전하게 일반 Provider로 우회시킵니다.
  // AS-IS: typeof persister.restoreClient === 'function'
// TO-BE: 아래와 같이 'restoreClient' in persister 조건으로 변경

const hasValidPersister = 
  persister && 
  'restoreClient' in persister && 
  typeof persister.restoreClient === 'function';

  if (!hasValidPersister) {
    return (
      <SessionProvider>
        <QueryClientProvider client={client}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    );
  }

  // 규격이 완벽히 일치하는 persister가 있을 때만 Persist 공급자를 켭니다.
  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={client}
        persistOptions={{ persister: persister as any }} // 💡 as any 추가
      >
        {children}
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}