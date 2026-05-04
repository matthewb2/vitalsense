"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { Dumbbell, Clock, Plus, List, Trash2, ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';

type ExerciseType = 'running' | 'walking' | 'swimming' | 'cycling' | 'weight' | 'yoga' | 'other';

interface ExerciseRecord {
  _id: number;
  date: string;
  exerciseType: ExerciseType;
  content: string;
}

const exerciseLabels: Record<ExerciseType, string> = {
  running: '러닝',
  walking: '걷기',
  swimming: '수영',
  cycling: '자전거',
  weight: '헬스',
  yoga: '요가',
  other: '기타',
};

const caloriesPerMinute: Record<ExerciseType, number> = {
  running: 10,
  walking: 4,
  swimming: 11,
  cycling: 8,
  weight: 6,
  yoga: 3,
  other: 5,
};

const exerciseColors: Record<ExerciseType, string> = {
  running: 'bg-orange-100 text-orange-600',
  walking: 'bg-green-100 text-green-600',
  swimming: 'bg-blue-100 text-blue-600',
  cycling: 'bg-yellow-100 text-yellow-600',
  weight: 'bg-red-100 text-red-600',
  yoga: 'bg-purple-100 text-purple-600',
  other: 'bg-gray-100 text-gray-600',
};

export default function ExercisePage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<ExerciseRecord[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exerciseType: 'running' as ExerciseType,
    duration: '',
    calories: '',
    content: '',
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?._id) {
      const token = user?.token?.accessToken || user?.accessToken;
      if (token) {
        fetchHistory(token);
      }
    }
  }, [user?._id, user?.token]);

  const fetchHistory = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}?type=exercise`, {
        method: 'GET',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      if (data.ok && data.item) {
        const userId = user?._id;
        const filtered = data.item.filter((item: any) => item.user?._id === userId);

        const parsed = filtered.map((item: any) => {
          let exerciseType = item.extra?.exerciseType || 'other';
          
          if (exerciseType === 'other' && item.title) {
            if (item.title.startsWith('러닝')) exerciseType = 'running';
            else if (item.title.startsWith('걷기')) exerciseType = 'walking';
            else if (item.title.startsWith('수영')) exerciseType = 'swimming';
            else if (item.title.startsWith('자전거')) exerciseType = 'cycling';
            else if (item.title.startsWith('헬스')) exerciseType = 'weight';
            else if (item.title.startsWith('요가')) exerciseType = 'yoga';
          }
          
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            exerciseType: exerciseType,
            content: item.content,
          };
        });

        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const calculateCalories = () => {
    const duration = parseInt(formData.duration) || 0;
    if (duration > 0) {
      const calories = Math.round(duration * caloriesPerMinute[formData.exerciseType as ExerciseType]);
      setFormData(prev => ({ ...prev, calories: calories.toString() }));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, duration: e.target.value });
    setTimeout(calculateCalories, 100);
  };

  const handleTypeChange = (type: ExerciseType) => {
    setFormData({ ...formData, exerciseType: type });
    setTimeout(calculateCalories, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exerciseType || !formData.duration) return;

    setLoading(true);

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    if (!currentToken) {
      setLoading(false);
      return;
    }

    const contentText = formData.content 
      ? `\n메모: ${formData.content}` 
      : '';

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'exercise',
          title: `${exerciseLabels[formData.exerciseType as ExerciseType]} - ${formData.duration}분${formData.calories ? ` (${formData.calories}kcal)` : ''}`,
          content: `측정 일시: ${formData.date}\n운동: ${exerciseLabels[formData.exerciseType as ExerciseType]}\n시간: ${formData.duration}분${formData.calories ? `\n소모 칼로리: ${formData.calories}kcal` : ''}${contentText}`,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            exerciseType: formData.exerciseType,
            duration: formData.duration,
            calories: formData.calories,
          },
        }),
      });

      setSaved(true);
      fetchHistory(currentToken);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        exerciseType: 'running',
        duration: '',
        calories: '',
        content: '',
      });
      
      setTimeout(() => {
        setSaved(false);
        setActiveTab('list');
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ExerciseRecord) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    if (!currentToken) return;

    try {
      await fetch(`${API_URL}?id=${item._id}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
      });

      fetchHistory(currentToken);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, ExerciseRecord[]>);

  const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
        active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />
      <Navigation />

      <main className="max-w-2xl mx-auto mt-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={20} /> 메인으로
        </Link>

        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 w-fit mx-auto border border-slate-200">
          <TabButton
            active={activeTab === 'list'}
            onClick={() => setActiveTab('list')}
            icon={<List size={18} />}
            label="기록 목록"
          />
          <TabButton
            active={activeTab === 'record'}
            onClick={() => setActiveTab('record')}
            icon={<Plus size={18} />}
            label="운동 기록"
          />
        </div>

        {activeTab === 'list' ? (
          <div className="space-y-6">
            {Object.keys(groupedHistory).length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center text-slate-400">
                기록된 운동 데이터가 없습니다.
              </div>
            ) : (
              Object.entries(groupedHistory).map(([date, items]) => (
                <div key={date} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700">{date}</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {items.map((item) => {
                      const match = item.content.match(/시간: (\d+)분/);
                      const caloriesMatch = item.content.match(/소모 칼로리: (\d+)kcal/);
                      return (
                        <div key={item._id} className="p-4 flex items-start gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${exerciseColors[item.exerciseType as ExerciseType]}`}>
                            {exerciseLabels[item.exerciseType as ExerciseType]}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">
                              {match && `${match[1]}분`}
                              {caloriesMatch && <span className="ml-2 text-orange-500">{caloriesMatch[1]}kcal</span>}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Dumbbell size={24} /> 운동 기록
              </h2>
              <p className="text-sm opacity-90 mt-1">오늘 운동을 하셨나요?</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Clock size={14} /> 날짜
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">운동 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['running', 'walking', 'swimming', 'cycling', 'weight', 'yoga', 'other'] as ExerciseType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`p-3 rounded-xl text-sm font-bold transition ${
                        formData.exerciseType === type
                          ? exerciseColors[type]
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {exerciseLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">시간 (분)</label>
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-mono text-lg"
                    value={formData.duration}
                    onChange={handleDurationChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                    <Flame size={14} /> 칼로리(kcal)
                  </label>
                  <input
                    type="number"
                    placeholder="300"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-mono text-lg"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">메모 (선택)</label>
                <textarea
                  placeholder="인터벌 러닝 30분"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.duration}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saved ? '저장됨!' : loading ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}