"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Heart, Droplets, Utensils } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/app/components/Header';
import RecommendationSection from '@/components/RecommendationSection';
import ChatWidget from '@/components/ChatWidget';
import { useAuthStore } from '@/store/authStore';


export default function HealthDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isLoggedIn, router]);

  const currentToken = user?.token?.accessToken || user?.accessToken;
  const userId = user?._id || user?.extra?.userId;

  const fetchDashboard = async () => {
    if (!currentToken || !userId) throw new Error('No auth');

    const [bpRes, sugarRes, bmiRes, dietRes, exerciseRes] = await Promise.all([
      fetch('/api/posts/users?type=bp&limit=100', {
        headers: { Authorization: `Bearer ${currentToken}` }
      }),
      fetch('/api/posts/users?type=blood-sugar&limit=100', {
        headers: { Authorization: `Bearer ${currentToken}` }
      }),
      fetch('/api/posts/users?type=bmi&limit=100', {
        headers: { Authorization: `Bearer ${currentToken}` }
      }),
      fetch('/api/posts/users?type=diet&limit=100', {
        headers: { Authorization: `Bearer ${currentToken}` }
      }),
      fetch('/api/posts/users?type=exercise&limit=100', {
        headers: { Authorization: `Bearer ${currentToken}` }
      }),
    ]);

    const [bpData, sugarData, bmiData, dietData, exerciseData] = await Promise.all([
      bpRes.json(), sugarRes.json(), bmiRes.json(), dietRes.json(), exerciseRes.json()
    ]);

    const today = new Date().toISOString().split('T')[0];

    const todayDietItems = (dietData.item || []).filter((item: any) =>
      item.content && item.content.includes(`측정 일시: ${today}`)
    );
    const todayExerciseItems = (exerciseData.item || []).filter((item: any) =>
      item.content && item.content.includes(`측정 일시: ${today}`)
    );

    const latestBp = (bpData.item || [])[0];
    const latestSugar = (sugarData.item || [])[0];
    const latestBmi = (bmiData.item || [])[0];

    let bpValue = '기록없음';
    if (latestBp?.title) {
      bpValue = latestBp.title.replace('혈압 기록 - ', '') || '기록없음';
    }
    let sugarValue = '기록없음';
    if (latestSugar?.title) {
      const match = latestSugar.title.match(/(\d+)\s*mg/);
      sugarValue = match ? match[1] : '기록없음';
    }
    let bmiValue = '기록없음';
    if (latestBmi?.title) {
      const bmiMatch = latestBmi.title.match(/BMI 기록 - ([\d.]+)/);
      bmiValue = bmiMatch ? bmiMatch[1] : '기록없음';
    }

    localStorage.setItem(`healthData_${userId}`, JSON.stringify({
      bp: bpValue, sugar: sugarValue, bmi: bmiValue, updatedAt: new Date().toISOString()
    }));

    return {
      bp: { value: bpValue, status: '' },
      sugar: { value: sugarValue, status: '' },
      bmi: { value: bmiValue, status: '' },
      todayDiet: todayDietItems,
      todayExercise: todayExerciseItems,
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: !!currentToken && !!userId && isLoggedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 ">
      <Header />

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* 생체 지표 카드 섹션 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <HealthCard 
            title="혈압" 
            value={data?.bp.value || '기록없음'} 
            unit="mmHg" 
            icon={<Heart className="text-red-500 w-4 h-4 sm:w-5 sm:h-5" />} 
            status={data?.bp.status || ''} 
            href="/blood-pressure"
            loading={isLoading}
          />
          <HealthCard 
            title="혈당" 
            value={data?.sugar.value || '기록없음'} 
            unit="mg/ml" 
            icon={<Droplets className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />} 
            status={data?.sugar.status || ''} 
            color="text-orange-500"
            href="/blood-sugar"
            loading={isLoading}
          />
          <HealthCard 
            title="BMI" 
            value={data?.bmi.value || '기록없음'} 
            unit="index" 
            icon={<Activity className="text-purple-500 w-4 h-4 sm:w-5 sm:h-5" />} 
            status={data?.bmi.status || ''}
            href="/bmi"
            loading={isLoading}
          />
        </div>

        {/* 식단 및 운동 요약 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Utensils size={20} /> 오늘 하루 기록
          </h3>
          <div className="space-y-4">
            {data?.todayDiet?.length === 0 ? (
              <Link href="/diet" className="block">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-slate-400">식단: 기록없음</span>
                  <span className="text-sm text-blue-500">기록하기</span>
                </div>
              </Link>
            ) : (
              <Link href="/diet" className="block">
                <div className="space-y-2">
                  {data?.todayDiet?.map((item: any, i: number) => {
                    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'other' = item.extra?.mealType || 'other';
                    
                    if ((mealType === 'other') && item.title) {
                      if (item.title.startsWith('아침')) mealType = 'breakfast';
                      else if (item.title.startsWith('점심')) mealType = 'lunch';
                      else if (item.title.startsWith('저녁')) mealType = 'dinner';
                    }
                    const mealLabel = { breakfast: '아침', lunch: '점심', dinner: '저녁', other: '기타' }[mealType];
                    const content = item.content.split('\n')[1]?.split(': ')[1] || '';
                    return (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                        <span>{mealLabel}: {content}</span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            )}

            {data?.todayExercise?.length === 0 ? (
              <Link href="/exercise" className="block">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-slate-400">운동: 기록없음</span>
                  <span className="text-sm text-orange-500">기록하기</span>
                </div>
              </Link>
            ) : (
              <Link href="/exercise" className="block">
                <div className="space-y-2">
                {data?.todayExercise?.map((item: any, i: number) => {
let exerciseType = item.extra?.exerciseType;
let duration = item.extra?.duration;
let calories = item.extra?.calories ? ` -${item.extra.calories}kcal` : '';

if (!exerciseType && item.title) {
  if (item.title.startsWith('러닝')) exerciseType = 'running';
  else if (item.title.startsWith('걷기')) exerciseType = 'walking';
  else if (item.title.startsWith('수영')) exerciseType = 'swimming';
  else if (item.title.startsWith('자전거')) exerciseType = 'cycling';
  else if (item.title.startsWith('헬스')) exerciseType = 'weight';
  else if (item.title.startsWith('요가')) exerciseType = 'yoga';
}

if (!duration && item.title) {
  const durationMatch = item.title.match(/(\d+)분/);
  if (durationMatch) duration = durationMatch[1];
}

const exerciseLabels = { 
  running: '러닝', 
  walking: '걷기', 
  swimming: '수영', 
  cycling: '자전거', 
  weight: '헬스', 
  yoga: '요가', 
  other: '기타' 
};
const exerciseLabel = exerciseLabels[exerciseType as keyof typeof exerciseLabels] || '기타';

return (
  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
    <span>운동: {exerciseLabel} {duration ? `${duration}분` : ''}{calories}</span>
  </div>
);
})}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* AI 채팅 위젯 */}
        <ChatWidget />

        {/* 추천 콘텐츠 */}
        <RecommendationSection />
      </main>
    </div>
  );
}

// 수정된 HealthCard 컴포넌트
function HealthCard({ title, value, unit, icon, status, color = "text-green-500", href, className = "", loading = false }: any) {
  if (loading) {
    return (
      <div className={`bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 h-full animate-pulse ${className}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg w-8 h-8"></div>
          <div className="h-4 bg-slate-100 rounded w-12"></div>
        </div>
        <div className="flex items-baseline gap-1">
          <div className="h-6 sm:h-8 bg-slate-100 rounded w-20"></div>
          <div className="h-3 bg-slate-100 rounded w-8"></div>
        </div>
      </div>
    );
  }

  const CardContent = (
    <div className={`bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer h-full ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 sm:p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className="text-xs sm:text-sm text-slate-500 font-medium">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 justify-center">
        <span className="text-lg sm:text-xl">{value}</span>
        {unit && <span className="text-[0.7rem] text-slate-400"> {unit}</span>}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}