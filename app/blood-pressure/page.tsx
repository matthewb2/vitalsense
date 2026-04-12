"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Heart, Calendar, Save, LineChart as ChartIcon, List, Plus } from 'lucide-react';
// 그래프를 위한 Recharts 컴포넌트
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BloodPressurePage() {
  const [activeTab, setActiveTab] = useState<'record' | 'chart'>('chart');
  const [loading, setLoading] = useState(false);
  
  // 데이터 상태 (실제 서비스에서는 DB에서 가져와야 함)
  const [history, setHistory] = useState([
    { date: '2026-04-08', systolic: 120, diastolic: 80, pulse: 72 },
    { date: '2026-04-09', systolic: 125, diastolic: 82, pulse: 75 },
    { date: '2026-04-10', systolic: 118, diastolic: 78, pulse: 70 },
    { date: '2026-04-11', systolic: 130, diastolic: 85, pulse: 80 },
    { date: '2026-04-12', systolic: 122, diastolic: 81, pulse: 73 },
  ]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 기본값 오늘 날짜
    systolic: '',
    diastolic: '',
    pulse: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 백엔드 전송 데이터 구성
    const newData = {
      date: formData.date,
      systolic: Number(formData.systolic),
      diastolic: Number(formData.diastolic),
      pulse: Number(formData.pulse),
    };

    try {
      const response = await fetch('/api/health/blood-pressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });

      if (response.ok) {
        setHistory([...history, newData].sort((a, b) => a.date.localeCompare(b.date)));
        alert('기록되었습니다.');
        setActiveTab('chart');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-4xl mx-auto mt-6">
        {/* 상단 탭 메뉴 */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 w-fit mx-auto border border-slate-200">
          <TabButton 
            active={activeTab === 'chart'} 
            onClick={() => setActiveTab('chart')} 
            icon={<ChartIcon size={18} />} 
            label="변화 그래프" 
          />
          <TabButton 
            active={activeTab === 'record'} 
            onClick={() => setActiveTab('record')} 
            icon={<Plus size={18} />} 
            label="수치 기록" 
          />
        </div>

        {activeTab === 'chart' ? (
          <div className="space-y-6">
            {/* 그래프 카드 */}
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Heart className="text-red-500" size={20} /> 혈압 추이 분석
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="systolic" name="수축기" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" name="이완기" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 최근 기록 목록 */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><List size={18} /> 최근 기록</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-4">날짜</th>
                      <th className="p-4">수축기</th>
                      <th className="p-4">이완기</th>
                      <th className="p-4">맥박</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.slice().reverse().map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-medium">{item.date}</td>
                        <td className="p-4 text-blue-600 font-bold">{item.systolic}</td>
                        <td className="p-4 text-emerald-600 font-bold">{item.diastolic}</td>
                        <td className="p-4 text-slate-600">{item.pulse}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 입력 폼 카드 */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto overflow-hidden">
            <div className="bg-blue-600 p-6 text-white text-center">
              <h2 className="text-xl font-bold">새 기록 추가</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <InputItem label="수축기" unit="mmHg" value={formData.systolic} onChange={(v: string) => setFormData({...formData, systolic: v})} />
                <InputItem label="이완기" unit="mmHg" value={formData.diastolic} onChange={(v: string) => setFormData({...formData, diastolic: v})} />
              </div>
              <InputItem label="맥박" unit="bpm" value={formData.pulse} onChange={(v: string) => setFormData({...formData, pulse: v})} />
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
              >
                {loading ? '저장 중...' : '기록 저장하기'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// 컴포넌트 내부 헬퍼 컴포넌트들의 타입 정의
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
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

interface InputItemProps {
  label: string;
  unit: string;
  value: string | number;
  onChange: (value: string) => void; // v의 타입을 string으로 명시
}

function InputItem({ label, unit, value, onChange }: InputItemProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-600">{label}</label>
      <div className="relative">
        <input 
          type="number" 
          placeholder="0"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value)} // 여기서 문자열을 전달함
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{unit}</span>
      </div>
    </div>
  );
}