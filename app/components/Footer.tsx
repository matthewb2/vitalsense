"use client";

import React from 'react';
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { useHideFooter } from './useHideFooter';

export default function Footer() {
  const hideFooter = useHideFooter();
  const currentYear = new Date().getFullYear();

  if (hideFooter) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/terms" className="text-slate-500 hover:text-blue-600 transition-colors">
              이용약관
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/privacy" className="text-slate-500 hover:text-blue-600 transition-colors">
              개인정보처리방침
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/location" className="text-slate-500 hover:text-blue-600 transition-colors">
              위치정보서비스
            </Link>
          </div>

          <div className="text-xs text-slate-400">
            © {currentYear} VitalSense AI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}