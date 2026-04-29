"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Heart, Calendar, Save, List, Plus, Edit2, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = '/api/posts';

export default function BloodPressurePage() {
  const { user } = useAuthStore();
  const token = user?.accessToken || '';
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [editModal, setEditModal] = useState<{open: boolean; item: any | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ systolic: '', diastolic: '' });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    systolic: '',
    diastolic: '',
  });

  useEffect(() => {
    if (user?._id && token) {
      fetchHistory();
    }
  }, [user?._id, token]);

  const fetchHistory = async () => {
    setFetching(true);
    try {
      const response = await fetch(`${API_URL}?type=bp`, {
        method: 'GET',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
console.log('Blood pressure history response:', data);
        
        if (data.ok && data.item) {
          const userId = user?._id;
          const filtered = data.item.filter((item: any) => item.user?._id === userId);
          console.log('Filtered items:', filtered);
          
const formatTime = (dateTime: string) => {
            console.log('Raw dateTime:', dateTime);
            const match = dateTime.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
            if (!match) return dateTime;
            const hour = parseInt(match[4]);
            const minute = match[5];
            const ampm = hour >= 12 ? '오후' : '오전';
            const hour12 = hour % 12 || 12;
            return `${ampm} ${hour12}:${minute}`;
          };
          
          const parsed = filtered.map((item: any) => {
            const contentMatch = item.content.match(/수축기 혈압: (\d+)mmHg\n확장기 혈압: (\d+)mmHg/);
            const dateTimeMatch = item.content.match(/측정 일시: (.+)/);
            const fullDateTime = dateTimeMatch ? dateTimeMatch[1] : '';
            
            // Extract date and time - handle various formats
            let dateOnly = '';
            let timeOnly = '';
            
            if (fullDateTime) {
              // Try to split by space or newline
              const parts = fullDateTime.split(/[\s\n]+/);
              dateOnly = parts[0] || '';
              timeOnly = parts[1] || '';
            }
            
            // Format time if available
            let formattedTime = '';
            if (timeOnly) {
              const timeMatch = timeOnly.match(/(\d+):(\d+)/);
              if (timeMatch) {
                const hour = parseInt(timeMatch[1]);
                const minute = timeMatch[2];
                const ampm = hour >= 12 ? '오후' : '오전';
                const hour12 = hour % 12 || 12;
                formattedTime = `${ampm} ${hour12}:${minute}`;
              }
            }
            
            return {
              _id: item._id,
              date: dateOnly,
              time: timeOnly,
              formattedTime: formattedTime,
              systolic: contentMatch ? contentMatch[1] : '',
              diastolic: contentMatch ? contentMatch[2] : '',
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
      console.log('=== Blood Pressure Submit ===');
      console.log('User:', user);
      console.log('Token:', token);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense', 
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'bp',
          title: `혈압 기록 - ${formData.systolic}/${formData.diastolic}`,
          content: `측정 일시: ${formData.date} ${formData.time}\n수축기 혈압: ${formData.systolic}mmHg\n확장기 혈압: ${formData.diastolic}mmHg`,
          extra: { userId: user?._id, userName: user?.name },
        }),
      });

      console.log('Authorization header sent:', `Bearer ${token}`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.ok) {
        setSaved(true);
        const newRecord = {
          date: formData.date,
          time: formData.time,
          systolic: formData.systolic,
          diastolic: formData.diastolic,
        };
        setHistory([newRecord, ...history]);
        setFormData({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), systolic: '', diastolic: '' });
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
    setEditForm({ systolic: item.systolic, diastolic: item.diastolic });
  };

  const handleDelete = async (item: any) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`${API_URL}?id=${item._id}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
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
    
    try {
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editModal.item._id,
          title: `혈압 기록 - ${editForm.systolic}/${editForm.diastolic}`,
          content: `측정 일시: ${editModal.item.date} ${editModal.item.time}\n수축기 혈압: ${editForm.systolic}mmHg\n확장기 혈압: ${editForm.diastolic}mmHg`,
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setHistory(history.map(h => 
          h._id === editModal.item._id 
            ? { ...h, systolic: editForm.systolic, diastolic: editForm.diastolic }
            : h
        ));
        setEditModal({ open: false, item: null });
      } else {
        setError(data.message || '수정에 실패했습니다.');
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
                <h3 className="font-bold flex items-center gap-2 mb-4"><Heart size={18} className="text-red-500" /> 혈압 추이</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...history].reverse()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="systolic" name="수축기" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="diastolic" name="이완기" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Heart size={18} className="text-red-500" /> 혈압 기록</h3>
              </div>
              {fetching ? (
                <div className="p-8 text-center text-slate-400"> loading...</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  기록된 혈압 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="p-4">날짜/시간</th>
                        <th className="p-4">수축기</th>
                        <th className="p-4">이완기</th>
                        <th className="p-4">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-medium">{item.date} {item.formattedTime}</td>
                          <td className="p-4 text-blue-600 font-bold">{item.systolic}</td>
                          <td className="p-4 text-emerald-600 font-bold">{item.diastolic}</td>
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
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto overflow-hidden">
            <div className="bg-blue-600 p-6 text-white text-center">
              <h2 className="text-xl font-bold">혈압 기록 추가</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
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
                  <input 
                    type="time" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">수축기</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="120"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                      value={formData.systolic}
                      onChange={(e) => setFormData({...formData, systolic: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">mmHg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">이완기</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="80"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                      value={formData.diastolic}
                      onChange={(e) => setFormData({...formData, diastolic: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">mmHg</span>
                  </div>
                </div>
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
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
        active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
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
          <h3 className="text-lg font-bold">혈압 기록 수정</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">수축기 (mmHg)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                value={form.systolic}
                onChange={(e: any) => setForm({...form, systolic: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">이완기 (mmHg)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                value={form.diastolic}
                onChange={(e: any) => setForm({...form, diastolic: e.target.value})}
              />
            </div>
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
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}