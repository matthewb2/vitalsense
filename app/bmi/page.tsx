"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { useSwipeNavigate } from '../components/useSwipeNavigate';
import { Activity, Calculator, Ruler, Scale, ArrowLeft, Edit2, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useVitalData, useCreateVital, useDeleteVital, useUpdateVital } from '@/hooks/useVitalData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

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
  const [saved, setSaved] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [editModal, setEditModal] = useState<{open: boolean; item: HistoryItem | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ height: '', weight: '' });

  useSwipeNavigate('/blood-sugar', '/diet');

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

  const { data: rawHistory = [], isFetching } = useVitalData('bmi');
  const createMutation = useCreateVital('bmi');
  const deleteMutation = useDeleteVital('bmi');
  const updateMutation = useUpdateVital('bmi');

  const history = useMemo(() => {
    return rawHistory.map((item: any) => {
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
  }, [rawHistory]);

  const calculateBmi = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    
    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      const bmi = weight / (heightM * heightM);
      setCalculatedBmi(bmi);
    }
  };

  const handleEdit = (item: HistoryItem) => {
    setEditModal({ open: true, item });
    setEditForm({ height: item.height, weight: item.weight });
  };

  const handleDelete = async (item: HistoryItem) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    await deleteMutation.mutateAsync(item._id);
    if (history.length - 1 <= visibleCount && visibleCount > 5) {
      setVisibleCount(prev => Math.max(5, prev - 5));
    }
  };

  const handleUpdate = async () => {
    if (!editModal.item) return;
    const bmi = calculateBmiFinal(parseFloat(editForm.height), parseFloat(editForm.weight));
    await updateMutation.mutateAsync({
      id: editModal.item._id,
      title: `BMI 기록 - ${bmi} (${editForm.height}cm, ${editForm.weight}kg)`,
      content: `측정 일시: ${editModal.item.date}\n신장: ${editForm.height}cm\n체중: ${editForm.weight}kg\nBMI: ${bmi}`,
    });
    setEditModal({ open: false, item: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.height || !formData.weight) return;

    const userId = user?._id || user?.extra?.userId;
    const bodyData = { height: formData.height, weight: formData.weight };
    if (userId) {
      localStorage.setItem(`bodyData_${userId}`, JSON.stringify(bodyData));
    }

    const bmi = calculateBmiFinal(parseFloat(formData.height), parseFloat(formData.weight));
    
    await createMutation.mutateAsync({
      title: `BMI 기록 - ${bmi} (${formData.height}cm, ${formData.weight}kg)`,
      content: `측정 일시: ${new Date().toISOString().split('T')[0]}\n신장: ${formData.height}cm\n체중: ${formData.weight}kg\nBMI: ${bmi}`,
    });

    setSaved(true);
    setVisibleCount(5);
    
    setTimeout(() => {
      setSaved(false);
    }, 1500);
  };

  const calculateBmiFinal = (height: number, weight: number): string => {
    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      return (weight / (heightM * heightM)).toFixed(1);
    }
    return '';
  };

  const bmiStatus = calculatedBmi ? getBmiStatus(calculatedBmi) : null;

  const chartData = useMemo(() => {
    return [...history].slice(0, 10).reverse().map(item => ({
      date: item.date.slice(5),
      bmi: parseFloat(item.bmi),
    }));
  }, [history]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 ">
      <Header />
      
      <main className="max-w-2xl mx-auto mt-6 px-4">
        
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
              disabled={createMutation.isPending || !formData.height || !formData.weight}
              className="w-full py-4 bg-purple-500 text-white font-bold rounded-2xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? '저장됨!' : createMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </form>
        </div>

        {chartData.length > 1 && (
          <div className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Activity size={18} className="text-purple-500" /> BMI 변화 추이</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">              
                 <LineChart data={[...chartData].slice(0, 10)} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: '저체중', position: 'insideTopLeft', fontSize: 11, fill: '#3b82f6' }} />
                  <ReferenceLine y={23} stroke="#10b981" strokeDasharray="4 4" label={{ value: '정상', position: 'insideTopLeft', fontSize: 11, fill: '#10b981' }} />
                  <ReferenceLine y={25} stroke="#eab308" strokeDasharray="4 4" label={{ value: '과체중', position: 'insideTopLeft', fontSize: 11, fill: '#eab308' }} />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '비만', position: 'insideTopLeft', fontSize: 11, fill: '#ef4444' }} />
                  <Line type="monotone" dataKey="bmi" name="BMI" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {history.length > 0 && (
            <div className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="p-4 bg-slate-50 border-b border-slate-100 overflow-hidden rounded-t-3xl">
              <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-purple-500" /> BMI 기록 목록</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-4">날짜</th>
                    <th className="p-4">체중</th>
                    <th className="p-4">BMI</th>
                    <th className="p-4">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isFetching && !history.length ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400"> 로딩 중...</td></tr>
                  ) : (
                    history.slice(0, visibleCount).map((item: HistoryItem) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-medium">{item.date}</td>
                      <td className="p-4">{item.weight} kg</td>
                      <td className="p-4 text-purple-600 font-bold">{item.bmi}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(item)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                    )))}
                </tbody>
              </table>
            </div>
            {/* 수정된 더보기 영역 */}
              <div className="p-4 text-center border-t border-slate-100 bg-slate-50/30 rounded-b-3xl">
                {visibleCount < history.length ? (
                  <button 
                    onClick={() => setVisibleCount(prev => prev + 5)} 
                    className="text-sm text-blue-600 hover:text-blue-800 font-bold py-2 px-6 hover:bg-blue-50 rounded-xl transition"
                  >
                      ({(history.length - visibleCount) > 5 ? 5 : (history.length - visibleCount)}개 더보기)
                  </button>
                ) : (
                  <span className="text-sm text-slate-400 font-medium">
                    마지막 기록입니다. (총 {history.length}개)
                  </span>
                )}
              </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">BMI 기록 수정</h3>
                <button onClick={() => setEditModal({open: false, item: null})} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">신장 (cm)</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      value={editForm.height} onChange={(e) => setEditForm({...editForm, height: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">체중 (kg)</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      value={editForm.weight} onChange={(e) => setEditForm({...editForm, weight: e.target.value})} />
                  </div>
                </div>
                <button type="button" onClick={handleUpdate} disabled={updateMutation.isPending}
                  className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition disabled:opacity-50">
                  {updateMutation.isPending ? '저장 중...' : '수정하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}