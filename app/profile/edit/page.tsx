"use client";

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { User, Mail, Save, ArrowLeft, Calendar, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const API_URL = 'https://firm-catherine-mk-solution-5ac59407.koyeb.app/users/';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, setUser, checkAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      const currentExtra = user.extra;
      if (currentExtra && typeof currentExtra === 'object' && 'birthday' in currentExtra) {
        setBirthday(currentExtra.birthday || '');
      } else if (typeof currentExtra === 'string') {
        try {
          const parsed = JSON.parse(currentExtra);
          setBirthday(parsed.birthday || '');
        } catch {
          setBirthday('');
        }
      }
    }
  }, [user]);

  const handleSave = async () => {
    if (!name || !email) {
      setError('이름과 이메일을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    let extraObj: any = {};
    if (user?.extra) {
      if (typeof user.extra === 'string') {
        try {
          extraObj = JSON.parse(user.extra);
        } catch {}
      } else if (typeof user.extra === 'object') {
        extraObj = { ...user.extra };
      }
    }
    extraObj = { ...extraObj, birthday };

    const sendData: any = {};
    
    if (name !== user?.name) {
      sendData.name = name;
    }
    
    if (email !== user?.email) {
      sendData.email = email;
    }
    
    if (password) {
      sendData.password = password;
    }
    
    if (Object.keys(extraObj).length > 0) {
      sendData.extra = extraObj;
    }

    console.log('Sending data:', sendData);

    if (Object.keys(sendData).length === 0) {
      setError('변경된 내용이 없습니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: user?._id, ...sendData }),
      });

      const data = await response.json();
      console.log('Update response:', data);
      console.log('Update errors:', data.errors);

      if (data.ok && data.item) {
        setUser(data.item);
        setSaved(true);
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).map((err: any) => err.msg).join(', ');
          setError(errorMessages);
        } else {
          setError(data.message || '정보 수정에 실패했습니다.');
        }
      }
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-md mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft size={20} />
          뒤로
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <User className="text-blue-600" />
            회원 정보 수정
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">이름</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">생년월일</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">비밀번호 (변경 시에만 입력)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? '저장 중...' : '저장'}
            </button>

            {saved && (
              <p className="text-center text-green-600 font-medium">저장되었습니다!</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}