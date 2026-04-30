"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Droplets, Calendar, Save, List, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = '/api/posts';

export default function BloodSugarPage() {
  const { user } = useAuthStore();
  const token = user?.accessToken || '';
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sugar: '',
    time: '공복',
  });

  useEffect(() => {
    if (user?._id && token) {
      fetchHistory();
    }
  }, [user?._id, token]);

  const fetchHistory = async () => {
    setFetching(true);
    try {
      const response = await fetch(`${API_URL}?type=blood-sugar`, {
        method: 'GET',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      console.log('Blood sugar history response:', data);
      
      if (data.ok && data.item) {
        const userId = user?._id;
        const filtered = data.item.filter((item: any) => item.user?._id === userId);
        console.log('Filtered items:', filtered);
        
        const parsed = filtered.map((item: any) => {
          const contentMatch = item.content.match(/혈당: (\d+)mg\/dL/);
          const dateTimeMatch = item.content.match(/측정 일시: (.+)/);
          const timeMatch = item.content.match(/측정 시간: (.+)/);
          
          return {
            _id: item._id,
            date: dateTimeMatch ? dateTimeMatch[1].split('\n')[0] : '',
            sugar: contentMatch ? contentMatch[1] : '',
            time: timeMatch ? timeMatch[1] : '',
          };
        });
        
        console.log('Parsed history:', parsed);
        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Current user:', user);
    console.log('User ID:', user?._id);
    console.log('User Name:', user?.name);
    console.log('User accessToken:', user?.accessToken);

    try {
      console.log('=== Blood Sugar Submit ===');
      console.log('Token:', token);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'blood-sugar',
          title: `혈당 기록 - ${formData.sugar}mg/dL (${formData.time})`,
          content: `측정 일시: ${formData.date}\n혈당: ${formData.sugar}mg/dL\n측정 시간: ${formData.time}`,
          extra: { userId: user?._id, userName: user?.name },
        }),
      });

      console.log('Authorization header sent:', `Bearer ${token}`);
      const data = await response.json();

      if (data.ok) {
        setSaved(true);
        const newRecord = {
          date: formData.date,
          sugar: formData.sugar,
          time: formData.time,
        };
        setHistory([newRecord, ...history]);
        setFormData({ date: new Date().toISOString().split('T')[0], sugar: '', time: '공복' });
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
          <div className="space-y-4">
            {history.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
                <h3 className="font-bold flex items-center gap-2 mb-4"><Droplets size={18} className="text-blue-500" /> 혈당 추이</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...history].reverse()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Line type="monotone" dataKey="sugar" name="혈당" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Droplets size={18} className="text-blue-500" /> 혈당 기록</h3>
              </div>
              {fetching ? (
                <div className="p-8 text-center text-slate-400"> loading...</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  기록된 혈당 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="p-4">날짜</th>
                        <th className="p-4">혈당</th>
                        <th className="p-4">측정 시간</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-medium">{item.date}</td>
                          <td className="p-4 text-blue-600 font-bold">{item.sugar} mg/dL</td>
                          <td className="p-4 text-slate-600">{item.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto overflow-hidden">
            <div className="bg-blue-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold">혈당 기록 추가</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Calendar size={14} /> 측정 날짜
                </label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">측정 시간</label>
                <div className="grid grid-cols-3 gap-2">
                  {['공복', '식후', '취침전'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setFormData({...formData, time})}
                      className={`py-2 px-3 rounded-xl text-sm font-bold transition ${
                        formData.time === time
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">혈당</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="100"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                    value={formData.sugar}
                    onChange={(e) => setFormData({...formData, sugar: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">mg/dL</span>
                </div>
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-100 disabled:opacity-50"
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
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}