"use client";

import React, { useEffect } from 'react';
import Header from '../components/Header';
import { User, Mail, Pencil, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return '정보 없음';
    return birthday;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft size={20} />
          메인으로
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="text-blue-600" />
              회원 정보
            </h1>
            <Link 
              href="/profile/edit"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Pencil size={16} />
              수정
            </Link>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt="profile" className="w-24 h-24 object-cover" />
              ) : (
                <User size={40} className="text-blue-600" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <User className="text-slate-400" size={20} />
              <div>
                <p className="text-xs text-slate-400">이름</p>
                <p className="font-medium">{user?.name || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Mail className="text-slate-400" size={20} />
              <div>
                <p className="text-xs text-slate-400">이메일</p>
                <p className="font-medium">{user?.email || '정보 없음'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Calendar className="text-slate-400" size={20} />
              <div>
                <p className="text-xs text-slate-400">생년월일</p>
                <p className="font-medium">{formatBirthday(user?.extra?.birthday)}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}