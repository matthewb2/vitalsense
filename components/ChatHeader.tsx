"use client";

import React, { useEffect } from 'react';
import { Settings, User, LogOut, Bell, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
}

function IconButton({ icon, onClick }: IconButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 text-slate-500 hover:bg-white hover:text-blue-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200 active:bg-slate-100"
    >
      {icon}
    </button>
  );
}

export default function ChatHeader() {
  const { user, isLoggedIn, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const userName = user?.name || '사용자';
  const userImage = user?.image || null;

  return (
    <header className="w-full flex justify-between items-center py-4 px-4 border-b">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
          <HeartPulse className="text-white w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-800 leading-none tracking-tight">바이탈센스 AI</h1>
          <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Big Data Health</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <IconButton icon={<Bell size={20} />} onClick={() => alert('알림이 없습니다.')} />
          <Link href="/settings">
            <IconButton icon={<Settings size={20} />} onClick={() => {}} />
          </Link>
        </div>

        <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 hover:border-blue-300 transition">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {userImage ? (
                  <img src={userImage} alt="profile" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <User size={14} className="text-blue-600" />
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden md:block">
                {userName}님
              </span>
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/signup">
              <button className="text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-100 transition">
                회원가입
              </button>
            </Link>
            <Link href="/login">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95">
                로그인
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}