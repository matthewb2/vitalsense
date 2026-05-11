"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { Activity, Calculator, Ruler, Scale, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';

interface HistoryItem {
  _id: number;
  date: string;
  height: string;
  weight: string;
  bmi: string;
}

function getBmiStatus(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: '저체중', color: 'text-blue-500' };
  if (bmi < 23) return { label: '정상', color: 'text-green-500' };
  if (bmi < 25) return { label: '과체중', color: 'text-yellow-500' };
  if (bmi < 30) return { label: '비만', color: 'text-orange-500' };
  return { label: '고도비만', color: 'text-red-500' };
}

export default function BmiPage() {
  const { user, checkAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
  });
  const [calculatedBmi, setCalculatedBmi] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const savedData = localStorage.getItem(`bodyData_${user?._id}`);
    if (savedData) {
      const { height } = JSON.parse(savedData);
      if (height) {
        setFormData(prev => ({ ...prev, height }));
      }
    }
  }, [user?._id]);

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
      const response = await fetch(`${API_URL}?type=bmi`, {
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
          const contentMatch = item.content.match(/체중: ([\d.]+)kg/);
          const heightMatch = item.content.match(/신장: ([\d.]+)cm/);
          const weight = contentMatch ? parseFloat(contentMatch[1]) : 0;
          const height = heightMatch ? parseFloat(heightMatch[1]) : 0;
          const bmi = height > 0 && weight > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '';
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            height: heightMatch ? heightMatch[1] : '',
            weight: contentMatch ? contentMatch[1] : '',
            bmi: bmi,
          };
        });

        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const calculateBmi = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    
    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      const bmi = weight / (heightM * heightM);
      setCalculatedBmi(bmi);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.height || !formData.weight) return;

    setLoading(true);

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const userId = user?._id || user?.extra?.userId;
      const bodyData = { height: formData.height, weight: formData.weight };
      if (userId) {
        localStorage.setItem(`bodyData_${userId}`, JSON.stringify(bodyData));
      }

      const bmi = calculateBmiFinal(parseFloat(formData.height), parseFloat(formData.weight));
      
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'bmi',
          title: `BMI 기록 - ${bmi} (${formData.height}cm, ${formData.weight}kg)`,
          content: `측정 일시: ${new Date().toISOString().split('T')[0]}\n신장: ${formData.height}cm\n체중: ${formData.weight}kg\nBMI: ${bmi}`,
          extra: { userId: user?._id, userName: user?.name },
        }),
      });

      setSaved(true);
      fetchHistory(currentToken);
      
      setTimeout(() => {
        setSaved(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBmiFinal = (height: number, weight: number): string => {
    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      return (weight / (heightM * heightM)).toFixed(1);
    }
    return '';
  };

  const bmiStatus = calculatedBmi ? getBmiStatus(calculatedBmi) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />
      <Navigation />

      <main className="max-w-2xl mx-auto mt-6">
        
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6 text-white text-center">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <Calculator size={24} /> BMI 계산기
            </h2>
            <p className="text-sm opacity-90 mt-1">신장과 체중을 입력하여 BMI를 계산하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Ruler size={14} /> 신장
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="170"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-mono text-lg"
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">cm</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Scale size={14} /> 체중
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="70"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-mono text-lg"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">kg</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={calculateBmi}
              className="w-full py-4 bg-purple-100 text-purple-600 font-bold rounded-2xl hover:bg-purple-200 transition flex items-center justify-center gap-2"
            >
              <Activity size={20} /> BMI 계산하기
            </button>

            {calculatedBmi && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100 text-center">
                <p className="text-sm text-slate-500 mb-2">계산된 BMI</p>
                <p className="text-5xl font-bold text-purple-600 mb-2">{calculatedBmi.toFixed(1)}</p>
                {bmiStatus && (
                  <p className={`text-lg font-bold ${bmiStatus.color}`}>{bmiStatus.label}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.height || !formData.weight}
              className="w-full py-4 bg-purple-500 text-white font-bold rounded-2xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? '저장됨!' : loading ? '저장 중...' : '저장'}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <div className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-purple-500" /> BMI 기록 목록</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-4">날짜</th>
                    <th className="p-4">신장</th>
                    <th className="p-4">체중</th>
                    <th className="p-4">BMI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-medium">{item.date}</td>
                      <td className="p-4">{item.height} cm</td>
                      <td className="p-4">{item.weight} kg</td>
                      <td className="p-4 text-purple-600 font-bold">{item.bmi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}