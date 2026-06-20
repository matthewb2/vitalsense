"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Heart, Droplets, Utensils, Newspaper, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/app/components/Header';
import ChatWidget from '@/components/ChatWidget';
import { useAuthStore } from '@/store/authStore';


export default function HealthDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + 5);
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, []);

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

    // 기존 데이터 요청과 함께 새로 만든 뉴스 API도 동시에 호출합니다.
    const [bpRes, sugarRes, bmiRes, dietRes, exerciseRes, newsRes] = await Promise.all([
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
      fetch('/api/news').catch(() => null), // 뉴스 에러 방지 처리
    ]);

    const [bpData, sugarData, bmiData, dietData, exerciseData, newsData] = await Promise.all([
      bpRes.json(), sugarRes.json(), bmiRes.json(), dietRes.json(), exerciseRes.json(),
      newsRes ? newsRes.json() : { items: [] }
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
      news: newsData?.items || [] // 2개의 기사 배열을 데이터에 포함시킵니다.
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


        {/* 연합뉴스 RSS 최신 건강 뉴스 섹션 (검색 결과 스타일) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
            <Newspaper size={20} className="text-blue-500" /> RSS 뉴스 피드
          </h3>
          <div className="space-y-4">
            {isLoading ? (
              // 스켈레톤 로딩 로직
              [1, 2].map((n) => (
                <div key={n} className="p-4 border border-slate-100 rounded-xl animate-pulse space-y-2">
                  <div className="h-5 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                </div>
              ))
            ) : data?.news && data.news.length > 0 ? (
              <>
              {data.news.slice(0, visibleCount).map((item: any, idx: number) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition text-base line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description || '관련 뉴스 기사입니다.'}
                      </p>
                      <span className="inline-block text-xs text-slate-400 pt-1">
                        {item.source || 'Google 뉴스'} · {item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : ''}
                      </span>
                      {item.link && item.link !== '#' && (
                        <p className="text-xs text-slate-300 truncate max-w-full pt-0.5">
                          {item.link.replace(/^https?:\/\//, '').slice(0, 40)}{item.link.replace(/^https?:\/\//, '').length > 40 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition shrink-0 mt-1" />
                  </div>
                </a>
              ))}
              {visibleCount < data.news.length && (
                <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">불러올 수 있는 뉴스가 없습니다.</p>
            )}
          </div>
        </div>


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