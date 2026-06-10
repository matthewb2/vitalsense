"use client";

import React, { useEffect } from 'react';
import { Settings, User, LogOut, Bell, HeartPulse, Home, Heart, Droplets, Calculator, Utensils, Dumbbell, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export default function Header({ title }: { title?: string }) {
  const { user, isLoggedIn, checkAuth, logout } = useAuthStore();
  const pathname = usePathname();
  const isMainPage = pathname === '/';

  const navItems = [    
    { href: '/chat', icon: MessageCircle, label: 'AI상담' },
    { href: '/blood-pressure', icon: Heart, label: '혈압' },
    { href: '/blood-sugar', icon: Droplets, label: '혈당' },
    { href: '/bmi', icon: Calculator, label: 'BMI' },
    { href: '/diet', icon: Utensils, label: '식단' },
    { href: '/exercise', icon: Dumbbell, label: '운동' },
  ];

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
   <header className="w-full mb-2 flex flex-col border-b border-slate-100 bg-white">
      {/* 1. 최상단 컨테이너를 flex flex-col로 주어 상단바와 네비바가 무조건 위아래로 쌓이게 만듭니다. */}
      
      {/* 2. 상단 레이아웃: 로고는 왼쪽, 알림/프로필은 오른쪽 끝에 배치 */}
      <div className="flex justify-between items-center py-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
            <HeartPulse className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 leading-none tracking-tight">{title || '바이탈센스'}</h1>
            <p className="hidden sm:block text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Big Data Health AI</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              <IconButton icon={<Bell size={20} />} onClick={() => alert('알림이 없습니다.')} />
              <Link href="/settings">
                <IconButton icon={<Settings size={20} />} onClick={() => {}} />
              </Link>
            </div>
          )}

          {isLoggedIn && <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>}

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 hover:border-blue-300 transition">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  {userImage ? (
                    <img src={userImage} alt="profile" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User size={14} className="text-blue-600" />
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-700 hidden md:block">
                  {userName}님
                </span>
              </Link>
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
      </div>

      {/* 3. 하단 레이아웃: 메인 페이지가 아닐 때 로고 '아래에' 한 줄로 깔끔하게 떨어지는 네비게이션 */}
      {!isMainPage && (
        <nav className="border-t border-slate-50 px-4 sm:px-8 py-2.5 bg-slate-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-blue-600 border border-transparent hover:border-slate-100'
                  }`}
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}