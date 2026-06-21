"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Heart, Droplets, Utensils, Newspaper, MoreVertical } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/app/components/Header';
import ChatWidget from '@/components/ChatWidget';
import Provider from '@/components/Provider';

import { useAuthStore } from '@/store/authStore';

export default function HealthDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 무한 스크롤 관찰자 설정 (Sentinel 노드)
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

  // 인증 확인 및 숨김 처리된 뉴스 목록 로드
  useEffect(() => {
    setMounted(true);
    checkAuth();
    try {
      const stored = JSON.parse(localStorage.getItem('newsHiddenIds') || '[]');
      setHiddenIds(new Set(stored));
    } catch {}
  }, [checkAuth]);

  // 미인증 유저 로그인 페이지 리다이렉트
  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isLoggedIn, router]);

  // 뉴스 아이템 숨기기 기능
  const hideNewsItem = (id: string) => {
    const next = new Set(hiddenIds);
    next.add(id);
    setHiddenIds(next);
    localStorage.setItem('newsHiddenIds', JSON.stringify([...next]));
    setOpenMenuIdx(null);
  };

  // 컨텍스트 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (openMenuIdx === null) return;
    const close = () => setOpenMenuIdx(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuIdx]);

  const currentToken = user?.token?.accessToken || user?.accessToken;
  const userId = user?._id || user?.extra?.userId;

  // 1. 건강 대시보드 API 호출 함수
  const fetchDashboard = async () => {
    if (!currentToken || !userId) throw new Error('No auth');

    const [bpRes, sugarRes, bmiRes, dietRes, exerciseRes] = await Promise.all([
      fetch('/api/posts/users?type=bp&limit=100', { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch('/api/posts/users?type=blood-sugar&limit=100', { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch('/api/posts/users?type=bmi&limit=100', { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch('/api/posts/users?type=diet&limit=100', { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch('/api/posts/users?type=exercise&limit=100', { headers: { Authorization: `Bearer ${currentToken}` } }),
    ]);

    const [bpData, sugarData, bmiData, dietData, exerciseData] = await Promise.all([
      bpRes.json(), sugarRes.json(), bmiRes.json(), dietRes.json(), exerciseRes.json(),
    ]);

    // 한국 시간(UTC+9) 기준으로 오늘 날짜 구하기
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const krTimeDiff = 9 * 60 * 60 * 1000;
    const today = new Date(utc + krTimeDiff).toISOString().split('T')[0];

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

  // 생체 데이터useQuery
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: !!currentToken && !!userId && isLoggedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 2. RSS 뉴스 데이터 useQuery (staleTime 최적화 적용)
  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Failed to fetch news');
      const json = await res.json();
      if (json.items) {
        localStorage.setItem('newsCache', JSON.stringify(json.items));
      }
      return json.items || [];
    },
    // 최적화: 캐시 저장소(StoragePersister) 연동 상태에서 기존 캐시를 즉시 그리되, 
    // staleTime을 0으로 주어 백그라운드에서 항상 새로운 RSS 데이터를 업데이트합니다.
    staleTime: 0, 
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 날짜 포맷팅 유틸리티 (화면 사이즈 조건부 반영용)
  const formatNewsDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return {
      short: `${month}/${day}`,          // 모바일용 (06/22)
      detailed: `${year}.${month}.${day}` // 데스크톱용 (2026.06.22)
    };
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 ">
      <Header />

      <main className="max-w-6xl mx-auto p-4 space-y-6">
      <Provider>
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
        </Provider>
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

        {/* RSS 뉴스 피드 섹션 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
            <Newspaper size={20} className="text-blue-500" /> RSS 뉴스 피드
          </h3>
          <div className="divide-y divide-slate-100">
            {newsLoading ? (
              [1, 2].map((n) => (
                <div key={n} className="p-4 border border-slate-100 rounded-xl animate-pulse space-y-2">
                  <div className="h-5 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                </div>
              ))
            ) : newsData && newsData.length > 0 ? (
              <>
                {newsData
                  .filter((item: any) => !hiddenIds.has(item.link))
                  .slice(0, visibleCount).map((item: any, idx: number) => {
                    const dateFormatted = formatNewsDate(item.pubDate);
                    
                    return (
                      <div
                        key={item.link}
                        className="block py-3 hover:bg-blue-50/30 transition group"
                      >
                        {item.ogImage && (
                          <img
                            src={item.ogImage}
                            alt=""
                            className="w-full h-40 object-cover rounded-lg mb-2 md:hidden"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition text-base line-clamp-1 flex-1 min-w-0">
                                <a href={item.link} rel="noopener noreferrer">
                                  {item.title}
                                </a>
                              </h4>
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpenMenuIdx(openMenuIdx === idx ? null : idx); }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {openMenuIdx === idx && (
                                  <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(item.link, '_blank'); }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                      새 탭에서 열기
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); hideNewsItem(item.link); }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                      숨기기
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description || '관련 뉴스 기사입니다.'}
                            </p>
                            
                            {/* 크기 대응 날짜 구현 */}
                            <div className="flex items-center text-xs text-slate-400 pt-1">
                              <span>{item.source || 'Google 뉴스'} ·&nbsp;</span>
{/* 모바일 화면용 (md 미만) */}
<span className="md:hidden">
  {typeof dateFormatted === 'object' ? dateFormatted.short : ''}
</span>
{/* 데스크톱 화면용 (md 이상) */}
<span className="hidden md:inline">
  {typeof dateFormatted === 'object' ? dateFormatted.detailed : ''}
</span>
                            </div>

                            {item.link && item.link !== '#' && (
                              <p className="text-xs text-slate-300 truncate max-w-full pt-0.5">
                                {item.link.replace(/^https?:\/\//, '').slice(0, 40)}{item.link.replace(/^https?:\/\//, '').length > 40 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          {item.ogImage && (
                            <img
                              src={item.ogImage}
                              alt=""
                              className="hidden md:block w-28 h-20 object-cover rounded-lg shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                {visibleCount < newsData.length && (
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