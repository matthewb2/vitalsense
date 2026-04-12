"use client";

import React from 'react';
import { Settings, User, LogOut, Bell, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

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

export default function Header() {
  const { data: session, status } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center py-4">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <div className="bg-blue-600 p-2 rounded-lg">
          <HeartPulse className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 leading-none tracking-tight">VitalSense AI</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Big Data Health</p>
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

        {status === 'loading' ? null : session ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {session.user?.image ? (
                  <img src={session.user.image} alt="profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <User size={14} className="text-blue-600" />
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden md:block">
                {session.user?.name || '사용자'}님
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <Link href="/login">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95">
              로그인
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
