"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuthStore } from '@/store/authStore';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = '/api/posts';

export default function NoticesPage() {
  const { user } = useAuthStore();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const token = user?.accessToken || user?.token?.accessToken;
      const headers: any = { 'client-id': 'vitalsense' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}?type=notice`, { headers });
      const data = await response.json();

      if (data.ok && data.item) {
        const sorted = [...data.item].sort((a: any, b: any) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime());
        setNotices(sorted);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">공지사항</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">로딩 중...</div>
          ) : notices.length === 0 ? (
            <div className="p-8 text-center text-slate-400">등록된 공지사항이 없습니다.</div>
          ) : (
            <>
              {notices.slice(0, visibleCount).map((item: any) => {
                const date = item.content?.split('측정 일시: ')[1]?.split('\n')[0] || item.createdAt?.split('T')[0] || '';
                const isExpanded = expanded === item._id;
                return (
                  <div key={item._id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : item._id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
                        {date && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar size={12} /> {date}</p>}
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400 shrink-0 ml-3" /> : <ChevronDown size={18} className="text-slate-400 shrink-0 ml-3" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-50 pt-4">
                        {item.content}
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleCount < notices.length && (
                <div className="p-4 text-center">
                  <button onClick={() => setVisibleCount(prev => prev + 10)} className="text-sm text-blue-600 hover:text-blue-800 font-bold py-2 px-6 hover:bg-blue-50 rounded-xl transition">
                    더보기 ({(notices.length - visibleCount) > 10 ? 10 : (notices.length - visibleCount)}개 남음)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
