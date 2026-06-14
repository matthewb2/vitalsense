"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuthStore } from '@/store/authStore';
import { Calendar, ChevronDown, ChevronUp, Send, Mail, User } from 'lucide-react';

const API_URL = '/api/posts';

export default function InquiriesPage() {
  const { user } = useAuthStore();
  const token = user?.accessToken || user?.token?.accessToken;
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [form, setForm] = useState({ title: '', content: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { fetchInquiries(); }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const headers: any = { 'client-id': 'vitalsense' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}?type=inquiry`, { headers });
      const data = await response.json();

      if (data.ok && data.item) {
        const sorted = [...data.item].sort((a: any, b: any) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime());
        setInquiries(sorted);
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const email = form.email || user?.email || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'client-id': 'vitalsense' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(API_URL, {
        method: 'POST', headers,
        body: JSON.stringify({
          type: 'inquiry',
          title: form.title,
          content: `문의자: ${email}\n${form.content}`,
          extra: { userId: user?._id, userName: user?.name, email },
        }),
      });

      setSubmitted(true);
      setForm({ title: '', content: '', email: '' });
      fetchInquiries();
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err) {
      console.error('Error submitting inquiry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">이용문의</h1>

        {/* 문의 작성 폼 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-lg mb-4">문의하기</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!user && (
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
              </div>
            )}
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="제목" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
            </div>
            <textarea placeholder="문의 내용을 입력하세요" rows={5} value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" required />
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              <Send size={16} /> {submitting ? '전송 중...' : '문의 보내기'}
            </button>
            {submitted && <p className="text-green-600 text-sm font-medium">문의가 등록되었습니다.</p>}
          </form>
        </div>

        {/* 문의 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-lg">문의 목록</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">로딩 중...</div>
          ) : inquiries.length === 0 ? (
            <div className="p-8 text-center text-slate-400">등록된 문의가 없습니다.</div>
          ) : (
            <>
              {inquiries.slice(0, visibleCount).map((item: any) => {
                const emailMatch = item.content?.match(/문의자: (.+)\n/);
                const cleanContent = item.content?.replace(/문의자: .+\n/, '') || '';
                const isExpanded = expanded === item._id;
                return (
                  <div key={item._id} className="border-b border-slate-100 last:border-b-0">
                    <button onClick={() => setExpanded(isExpanded ? null : item._id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          {emailMatch && <span>{emailMatch[1]}</span>}
                          <span>·</span>
                          <span className="flex items-center gap-1"><Calendar size={12} /> {item.createdAt?.split('T')[0] || ''}</span>
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400 shrink-0 ml-3" /> : <ChevronDown size={18} className="text-slate-400 shrink-0 ml-3" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-50 pt-4">
                        {cleanContent}
                        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">문의자: {emailMatch?.[1] || '알 수 없음'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleCount < inquiries.length && (
                <div className="p-4 text-center">
                  <button onClick={() => setVisibleCount(prev => prev + 10)} className="text-sm text-blue-600 hover:text-blue-800 font-bold py-2 px-6 hover:bg-blue-50 rounded-xl transition">
                    더보기 ({(inquiries.length - visibleCount) > 10 ? 10 : (inquiries.length - visibleCount)}개 남음)
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
