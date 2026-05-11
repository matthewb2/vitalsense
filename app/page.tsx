"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Heart, Droplets, Utensils, Search } from 'lucide-react';
import Header from './components/Header';
import { useAuthStore } from '@/store/authStore';

export default function HealthDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState({
    bp: { value: '', status: '' },
    sugar: { value: '', status: '' },
    bmi: { value: '', status: '' },
  });
  const [todayDiet, setTodayDiet] = useState<any[]>([]);
  const [todayExercise, setTodayExercise] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isLoggedIn, router]);

useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const currentToken = user?.token?.accessToken || user?.accessToken;
        const userId = user?._id || user?.extra?.userId;
        console.log('[DEBUG] user:', user);
        console.log('[DEBUG] userId:', userId);
        if (!currentToken || !userId) return;

        const healthDataKey = `healthData_${userId}`;
        const storedHealthData = localStorage.getItem(healthDataKey);
        if (storedHealthData) {
          const parsed = JSON.parse(storedHealthData);
          console.log('[DEBUG] Loaded from localStorage:', parsed);
          setHealthData({
            bp: { value: parsed.bp || '기록없음', status: '' },
            sugar: { value: parsed.sugar || '기록없음', status: '' },
            bmi: { value: parsed.bmi || '기록없음', status: '' },
          });
        }

        console.log('[DEBUG]Fetching health data...');

        const [bpRes, sugarRes, bmiRes, dietRes, exerciseRes] = await Promise.all([
          fetch('/api/posts/users?type=bp&limit=100', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts/users?type=blood-sugar&limit=100', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts/users?type=bmi&limit=100', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts/users?type=diet&limit=100', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts/users?type=exercise&limit=100', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
        ]);

        const bpData = await bpRes.json();
        const sugarData = await sugarRes.json();
        const bmiData = await bmiRes.json();
        const dietData = await dietRes.json();
        const exerciseData = await exerciseRes.json();

        const today = new Date().toISOString().split('T')[0];
        
        const allDietItems = dietData.item || [];
        const todayDietItems = allDietItems.filter((item: any) => 
          item.content && item.content.includes(`측정 일시: ${today}`)
        );
        
        const allExerciseItems = exerciseData.item || [];
        const todayExerciseItems = allExerciseItems.filter((item: any) => 
          item.content && item.content.includes(`측정 일시: ${today}`)
        );
        
        console.log('[DEBUG] todayDietItems:', todayDietItems);
        console.log('[DEBUG] todayExerciseItems:', todayExerciseItems);
        
        setTodayDiet(todayDietItems);
        setTodayExercise(todayExerciseItems);

        console.log('[DEBUG] BP Response:', bpData);
        console.log('[DEBUG] Sugar Response:', sugarData);
        console.log('[DEBUG] BMI Response:', bmiData);

        const allBpItems = bpData.item || [];
        const allSugarItems = sugarData.item || [];
        const allBmiItems = bmiData.item || [];

        console.log('[DEBUG] allBpItems:', allBpItems);
        console.log('[DEBUG] allSugarItems:', allSugarItems);
        console.log('[DEBUG] allBmiItems:', allBmiItems);
        
        const latestBp = allBpItems[0];
        const latestSugar = allSugarItems[0];
        const latestBmi = allBmiItems[0];

        console.log('[DEBUG] latestBp:', latestBp);
        console.log('[DEBUG] latestSugar:', latestSugar);
        console.log('[DEBUG] latestBmi:', latestBmi);

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
          console.log('[DEBUG] BMI from title:', bmiValue);
        }

        console.log('[DEBUG] Final values - BP:', bpValue, 'Sugar:', sugarValue, 'BMI:', bmiValue);

        localStorage.setItem(healthDataKey, JSON.stringify({
          bp: bpValue,
          sugar: sugarValue,
          bmi: bmiValue,
          updatedAt: new Date().toISOString()
        }));

        setHealthData({
          bp: { value: bpValue, status: '' },
          sugar: { value: sugarValue, status: '' },
          bmi: { value: bmiValue, status: '' },
        });
        setLoading(false);
      } catch (error) {
        console.error('[DEBUG] Failed to fetch health data:', error);
        setLoading(false);
      }
    };

    if (isLoggedIn && user) {
      fetchHealthData();
    }
  }, [isLoggedIn, user]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 왼쪽: 생체 지표 카드 섹션 */}
<div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <HealthCard 
              title="혈압" 
              value={healthData.bp.value || '기록없음'} 
              unit="" 
              icon={<Heart className="text-red-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.bp.status || ''} 
              href="/blood-pressure"
              loading={loading}
            />
            <HealthCard 
              title="혈당" 
              value={healthData.sugar.value || '기록없음'} 
              unit="" 
              icon={<Droplets className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.sugar.status || ''} 
              color="text-orange-500"
              href="/blood-sugar"
              loading={loading}
            />
            <HealthCard 
              title="BMI" 
              value={healthData.bmi.value || '기록없음'} 
              unit="" 
              icon={<Activity className="text-purple-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.bmi.status || ''}
              href="/bmi"
              loading={loading}
            />
          </div>

          {/* 식단 및 운동 요약 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Utensils size={20} /> 오늘 하루 기록
            </h3>
            <div className="space-y-4">
              {todayDiet.length === 0 ? (
                <Link href="/diet" className="block">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                    <span className="text-slate-400">식단: 기록없음</span>
                    <span className="text-sm text-blue-500">기록하기</span>
                  </div>
                </Link>
              ) : (
                <Link href="/diet" className="block">
                  <div className="space-y-2">
                    {todayDiet.map((item, i) => {
                      let mealType = item.extra?.mealType;
                      if (!mealType && item.title) {
                        if (item.title.startsWith('아침')) mealType = 'breakfast';
                        else if (item.title.startsWith('점심')) mealType = 'lunch';
                        else if (item.title.startsWith('저녁')) mealType = 'dinner';
                      }
                      const mealLabel = { breakfast: '아침', lunch: '점심', dinner: '저녁', other: '기타' }[mealType] || '기타';
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

              {todayExercise.length === 0 ? (
                <Link href="/exercise" className="block">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                    <span className="text-slate-400">운동: 기록없음</span>
                    <span className="text-sm text-orange-500">기록하기</span>
                  </div>
                </Link>
              ) : (
                <Link href="/exercise" className="block">
                  <div className="space-y-2">
                    {todayExercise.map((item, i) => {
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
                      
                      const exerciseLabel = { running: '러닝', walking: '걷기', swimming: '수영', cycling: '자전거', weight: '헬스', yoga: '요가', other: '기타' }[exerciseType] || '기타';
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
        </div>

        {/* 오른쪽: Google 검색 스타일 AI 채팅 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
          <Link href="/chat" className="block">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-full hover:shadow-md transition cursor-pointer">
              <Search size={20} className="text-slate-400" />
              <span className="text-slate-400">AI에게 물어보세요...</span>
            </div>
          </Link>
          
          {/* 최근 질문 (선택적) */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-slate-400 mb-2">추천 질문</p>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                혈압이 140/90이면 정상인가요?
              </div>
              <div className="text-sm text-slate-600 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                공복혈당 126mg/dL는 높은 것인가요?
              </div>
            </div>
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
      <div className="flex items-baseline gap-1">
        <span className="text-lg sm:text-xl">{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
    </div>
  );

  // href 속성이 있으면 Link로 감싸고, 없으면 그냥 출력
  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}