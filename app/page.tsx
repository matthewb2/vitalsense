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
  const [healthData, setHealthData] = useState({
    bp: { value: '', status: '' },
    sugar: { value: '', status: '' },
    bmi: { value: '', status: '' },
  });

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
        if (!currentToken) return;

        const [bpRes, sugarRes, weightRes] = await Promise.all([
          fetch('/api/posts?type=bp', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts?type=blood-sugar', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
          fetch('/api/posts?type=weight', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          }),
        ]);

        const bpData = await bpRes.json();
        const sugarData = await sugarRes.json();
        const weightData = await weightRes.json();

        const allBpItems = bpData.item || [];
        const allSugarItems = sugarData.item || [];
        const allWeightItems = weightData.item || [];
        
        // Get most recent items (first item is most recent)
        const latestBp = allBpItems[0];
        const latestSugar = allSugarItems[0];
        const latestWeight = allWeightItems[0];

        // Extract values from title
        const bpValue = latestBp 
          ? latestBp.title.replace('혈압 기록 - ', '') 
          : '기록없음';

        const sugarValue = latestSugar 
          ? latestSugar.title.split('- ')[1]?.split(' ')[0] || '기록없음' 
          : '기록없음';

        let bmiValue = '기록없음';
        if (latestWeight) {
          const weight = parseFloat(latestWeight.title.replace('체중 기록 - ', '').replace('kg', ''));
          const storedBodyData = localStorage.getItem('bodyData');
          if (storedBodyData) {
            const { height } = JSON.parse(storedBodyData);
            if (height && weight) {
              const heightM = parseFloat(height) / 100;
              const bmi = (weight / (heightM * heightM)).toFixed(1);
              bmiValue = bmi;
            }
          }
        }

        setHealthData({
          bp: { value: bpValue, status: '' },
          sugar: { value: sugarValue, status: '' },
          bmi: { value: bmiValue, status: '' },
        });
      } catch (error) {
        console.error('Failed to fetch health data:', error);
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
              unit="mmHg" 
              icon={<Heart className="text-red-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.bp.status || ''} 
              href="/blood-pressure"
            />
            <HealthCard 
              title="혈당" 
              value={healthData.sugar.value || '기록없음'} 
              unit="mg/dL" 
              icon={<Droplets className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.sugar.status || ''} 
              color="text-orange-500"
              href="/blood-sugar"
            />
            <HealthCard 
              title="BMI" 
              value={healthData.bmi.value || '기록없음'} 
              unit="Index" 
              icon={<Activity className="text-purple-500 w-4 h-4 sm:w-5 sm:h-5" />} 
              status={healthData.bmi.status || ''}
              href="/weight"
            />
          </div>

          {/* 식단 및 운동 요약 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Utensils size={20} /> 오늘 하루 기록
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span>아침: 닭가슴살 샐러드, 현미밥</span>
                <span className="text-sm text-slate-400">08:30</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span>운동: 인터벌 러닝 30분</span>
                <span className="text-sm text-blue-500 font-medium">-420 kcal</span>
              </div>
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
function HealthCard({ title, value, unit, icon, status, color = "text-green-500", href, className = "" }: any) {
  const CardContent = (
    <div className={`bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer h-full ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-1.5 sm:p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={`text-[10px] sm:text-xs font-bold ${color}`}>{status}</span>
      </div>
      <div className="text-lg sm:text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{title}</div>
    </div>
  );

  // href 속성이 있으면 Link로 감싸고, 없으면 그냥 출력
  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}