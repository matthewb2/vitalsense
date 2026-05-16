"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import Header from '@/app/components/Header';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';

export default function ChatHistoryPage() {
  const router = useRouter();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    fetchHistory();
  }, [isLoggedIn, router]);

  const fetchHistory = async () => {
    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken) return;

    try {
      const response = await fetch(`${API_URL}?type=chat&sort=_id,-1`, {
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (data.ok && data.item) {
        const userId = user?._id;
        const filtered = data.item.filter((item: any) => item.user?._id === userId);
        setChatHistory(filtered);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken) return;

    try {
      const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (data.ok) {
        setChatHistory(chatHistory.filter((item: any) => item._id !== id));
      }
    } catch (err) {
      console.error('Error deleting chat history:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/chat" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">채팅 히스토리</h1>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">로딩 중...</div>
        ) : chatHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <History size={48} className="mx-auto mb-4 text-slate-300" />
            <p>채팅 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((item) => (
              <div 
                key={item._id} 
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition relative group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-slate-700 whitespace-pre-wrap">{item.content}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDate(item.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}