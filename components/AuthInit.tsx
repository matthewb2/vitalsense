"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthInit({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = () => {
      console.debug('[AuthInit] Running checkAuth');
      checkAuth();
    };

    if (useAuthStore.persist.hasHydrated()) {
      console.debug('[AuthInit] Already hydrated, running immediately');
      run();
    } else {
      console.debug('[AuthInit] Waiting for hydration...');
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        console.debug('[AuthInit] Hydration finished, running checkAuth');
        run();
      });
      return () => unsub();
    }
  }, [checkAuth]);

  return <>{children}</>;
}
