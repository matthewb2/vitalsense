"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { HeartPulse, Mail, Lock, User, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const provider = searchParams.get('provider');
    const providerAccountId = searchParams.get('providerAccountId');
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    
    if (provider === 'google' && providerAccountId) {
      setEmail(emailParam || '');
      setName(nameParam || '');
    }
  }, [searchParams]);

  const isGoogleSignup = searchParams.get('provider') === 'google' && searchParams.get('providerAccountId');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const provider = searchParams.get('provider');
    const providerAccountId = searchParams.get('providerAccountId');

    try {
      const requestBody: any = {
        type: 'user',
        email,
        name,
        loginType: provider === 'google' ? 'google' : 'email',
      };

      if (provider === 'google' && providerAccountId) {
        requestBody.extra = { providerAccountId };
      } else {
        requestBody.password = password;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Signup response:', data);

      if (data.ok || data._id) {
        const userData = {
          _id: data._id || data.item?._id,
          email: data.email || data.item?.email,
          name: data.name || data.item?.name,
          type: data.type || data.item?.type,
          image: data.image || data.item?.image,
          loginType: 'google',
          accessToken: data.accessToken || data.token?.accessToken || data.item?.token?.accessToken,
          token: { accessToken: data.accessToken || data.token?.accessToken || data.item?.token?.accessToken },
        };
        setUser(userData);
        router.push('/');
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).map((err: any) => err.msg).join(', ');
          setError(errorMessages);
        } else {
          setError(data.message || '회원가입에 실패했습니다.');
        }
        setLoading(false);
      }
    } catch (err) {
      setError('오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4">
      <Header />

      <main className="max-w-md mx-auto mt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-2xl">
              <HeartPulse className="text-white" size={48} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">회원가입</h1>
          <p className="text-slate-500 text-center mb-8">VitalSense AI에 오신 것을 환영합니다</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">이름</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {!isGoogleSignup && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!isGoogleSignup}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            )}

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {success && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span>회원가입 성공! 로그인 페이지로 이동합니다.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? '회원가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인
            </Link>
          </p>
        </div>

        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={20} />
          메인으로
        </Link>
      </main>
    </div>
  );
}