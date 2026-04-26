"use client";

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (pathname === '/chat') {
    return <>{children}</>;
  }
  
  return (
    <>
      {children}
      <Footer />
    </>
  );
}