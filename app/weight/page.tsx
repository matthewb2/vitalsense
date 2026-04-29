"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Activity, Calendar, Save, List, Plus, Ruler, Edit2, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';

export default function WeightPage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<{open: boolean; item: any | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ height: '', weight: '' });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const getInitialBodyData = () => {
    if (typeof window === 'undefined') return { height: '', weight: '' };
    const saved = localStorage.getItem('bodyData');
    if (saved) {
      return JSON.parse(saved);
    }
    return { height: '', weight: '' };
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    height: '',
    weight: '',
  });

  useEffect(() => {
    const savedData = getInitialBodyData();
    setFormData(prev => ({
      ...prev,
      height: savedData.height,
      weight: savedData.weight,
    }));
  }, []);

  useEffect(() => {
    if (user?._id) {
      const currentToken = user?.token?.accessToken || user?.accessToken;
      if (currentToken) {
        fetchHistory(currentToken);
      }
    }
  }, [user?._id]);

  const fetchHistory = async (token?: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}?type=weight`, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    checkAuth();
    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    console.log('Current user from store:', currentUser);
    console.log('Token from store:', currentToken);
    console.log('LocalStorage auth-storage:', localStorage.getItem('auth-storage'));

    if (!currentToken) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    try {
      const bodyData = { height: formData.height, weight: formData.weight };
      localStorage.setItem('bodyData', JSON.stringify(bodyData));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'weight',
          title: `체중 기록 - ${formData.weight}kg`,
          content: `측정 일시: ${formData.date}\n신장: ${formData.height}cm\n체중: ${formData.weight}kg`,
          extra: { userId: user?._id, userName: user?.name },
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSaved(true);
        const newRecord = {
          date: formData.date,
          height: formData.height,
          weight: formData.weight,
        };
        setHistory([newRecord, ...history]);
        setFormData({ date: new Date().toISOString().split('T')[0], height: formData.height, weight: '' });
        setTimeout(() => {
          setSaved(false);
          setActiveTab('list');
        }, 1500);
      } else {
        setError(data.message || '등록에 실패했습니다.');
      }
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditModal({ open: true, item });
    setEditForm({ height: item.height, weight: item.weight });
  };

  const handleDelete = async (item: any) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken) return;

    try {
      const response = await fetch(`${API_URL}?id=${item._id}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
      });
      const data = await response.json();

      if (data.ok) {
        setHistory(history.filter(h => h._id !== item._id));
      } else {
        setError(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('오류가 발생했습니다.');
    }
  };

  const handleUpdate = async () => {
    if (!editModal.item) return;
    setLoading(true);

    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          id: editModal.item._id,
          title: `체중 기록 - ${editForm.weight}kg`,
          content: `측정 일시: ${editModal.item.date}\n신장: ${editForm.height}cm\n체중: ${editForm.weight}kg`,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setHistory(history.map(h =>
          h._id === editModal.item._id
            ? { ...h, height: editForm.height, weight: editForm.weight }
            : h
        ));
        setEditModal({ open: false, item: null });
      } else {
        setError(data.message || '수정에 실패했습니다.');
      }
    } catch (err) {
      setError('오류가 발생합니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-4xl mx-auto mt-6">
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
            label="수치 기록"
          />
        </div>

        {activeTab === 'list' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-green-500" /> 체중 기록</h3>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                기록된 체중 데이터가 없습니다.
              </div>
            ) : (
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
                    {history.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-medium">{item.date}</td>
                        <td className="p-4 text-green-600 font-bold">{item.weight} kg</td>
                        <td className="p-4 text-purple-600 font-bold">{item.bmi}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto overflow-hidden">
            <div className="bg-green-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold">체중 기록 추가</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Calendar size={14} /> 측정 날짜
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Ruler size={14} /> 신장
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="170"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-lg"
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">cm</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">체중</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="70.0"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-lg"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">kg</span>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition shadow-lg shadow-green-100 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '기록 저장하기'}
              </button>

              {saved && (
                <p className="text-center text-green-600 font-medium">저장되었습니다!</p>
              )}
            </form>
          </div>
        )}
      </main>

      <EditModal
        open={editModal.open}
        item={editModal.item}
        form={editForm}
        setForm={setEditForm}
        onClose={() => setEditModal({ open: false, item: null })}
        onSave={handleUpdate}
        loading={loading}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function EditModal({ open, item, form, setForm, onClose, onSave, loading }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">체중 기록 수정</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">체중 (kg)</label>
            <input
              type="number"
              step="0.1"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-mono"
              value={form.weight}
              onChange={(e: any) => setForm({...form, weight: e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}