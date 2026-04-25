"use client";

import { usePathname } from 'next/navigation';

export function useHideFooter() {
  const pathname = usePathname();
  return pathname === '/chat';
}