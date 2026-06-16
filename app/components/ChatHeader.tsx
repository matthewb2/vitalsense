"use client";

import React from 'react';
import { HeartPulse, User } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function ChatHeader() {
  const { user, isLoggedIn } = useAuthStore();

  return (
    <header className="w-full bg-white border-b border-slate-100">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <HeartPulse className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-800">바이탈센스</span>
        </Link>
        {isLoggedIn ? (
          <Link href="/profile" className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 hover:border-blue-300 transition">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt="profile" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <User size={14} className="text-blue-600" />
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 hidden sm:block">
              {user?.name || '사용자'}님
            </span>
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}