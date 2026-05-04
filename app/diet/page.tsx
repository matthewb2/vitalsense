"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { Utensils, Clock, Plus, List, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'other';

interface FoodRecord {
  _id: number;
  date: string;
  mealType: MealType;
  content: string;
}

const mealLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  other: '기타',
};

const mealColors: Record<MealType, string> = {
  breakfast: 'bg-amber-100 text-amber-600',
  lunch: 'bg-green-100 text-green-600',
  dinner: 'bg-blue-100 text-blue-600',
  other: 'bg-purple-100 text-purple-600',
};

export default function DietPage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<FoodRecord[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mealType: 'breakfast' as MealType,
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
      const response = await fetch(`${API_URL}?type=diet`, {
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
          let mealType = item.extra?.mealType || 'other';
          
          if (mealType === 'other' && item.title) {
            if (item.title.startsWith('아침')) mealType = 'breakfast';
            else if (item.title.startsWith('점심')) mealType = 'lunch';
            else if (item.title.startsWith('저녁')) mealType = 'dinner';
          }
          
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            mealType: mealType,
            content: item.content,
          };
        });

        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setLoading(true);

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'diet',
          title: `${mealLabels[formData.mealType as MealType]} - ${formData.content.slice(0, 20)}`,
          content: `측정 일시: ${formData.date}\n${mealLabels[formData.mealType as MealType]}: ${formData.content}`,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            mealType: formData.mealType 
          },
        }),
      });

      setSaved(true);
      fetchHistory(currentToken);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mealType: 'breakfast',
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

  const handleDelete = async (item: FoodRecord) => {
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
            label="식사 기록"
          />
        </div>

        {activeTab === 'list' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                기록된 식사 데이터가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-4">날짜</th>
                      <th className="p-4">식사</th>
                      <th className="p-4">메뉴</th>
                      <th className="p-4">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-medium">{item.date}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${mealColors[item.mealType as MealType]}`}>
                            {mealLabels[item.mealType as MealType]}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {item.content.split('\n')[1]?.split(': ')[1] || ''}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Utensils size={24} /> 식사 기록
              </h2>
              <p className="text-sm opacity-90 mt-1">오늘 무엇을 드셨나요?</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Clock size={14} /> 날짜
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">식사 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'other'] as MealType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, mealType: type})}
                      className={`p-3 rounded-xl text-sm font-bold transition ${
                        formData.mealType === type
                          ? mealColors[type]
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {mealLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">메뉴</label>
                <textarea
                  placeholder="예: 삼겹살, 채소 소스, 밥 한 공기"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 resize-none h-24"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.content.trim()}
                className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition disabled:opacity-50"
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