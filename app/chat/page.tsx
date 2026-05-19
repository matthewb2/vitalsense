"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, History, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/authStore';
import Header from '@/app/components/Header';

const initialMessages = [
  { role: 'ai', content: '안녕하세요! 저는 바이탈센스 에이전트입니다. 건강에 관한 무엇이든 물어보세요. 혈당, 혈압, 식단, 운동 등 다양한 건강 정보를 알려드릴 수 있습니다.' }
];

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isLoggedIn) {
      router.push('/login');
    }
  }, [mounted, isLoggedIn, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchChatHistory = async () => {
    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken) return;
    
    try {
      const response = await fetch('/api/posts?type=chat&sort=_id,-1', {
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
    }
  };

  useEffect(() => {
    if (mounted && isLoggedIn) {
      fetchChatHistory();
    }
  }, [mounted, isLoggedIn]);

  const handleHistoryClick = (content: string) => {
    setInput(content);
    setShowHistory(false);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const currentToken = user?.token?.accessToken || user?.accessToken;
    if (!currentToken || !itemId) return;
    
    try {
      const response = await fetch(`/api/posts?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (data.ok) {
        setChatHistory(prev => prev.filter(item => item._id !== itemId));
      }
    } catch (err) {
      console.error('Error deleting chat history:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      
      const data = await response.json();
      console.log('[Chat] Response:', data);
      
      if (!response.ok || data.error) {
        setMessages([...newMessages, { role: 'ai', content: data.error || '오류가 발생했습니다.' }]);
      } else {
        setMessages([...newMessages, { role: 'ai', content: data.content }]);
      }

      const currentToken = user?.token?.accessToken || user?.accessToken;
      if (currentToken) {
        await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-id': 'vitalsense',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            type: 'chat',
            title: userMessage.slice(0, 50),
            content: userMessage,
            extra: { userId: user?._id, userName: user?.name }
          }),
        });
        fetchChatHistory();
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'ai', content: '죄송합니다. 응답을 생성하는 데 오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="바이탈센스 AI" />
      
      {/* 히스토리 패널 */}
      {showHistory && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">이전 질문 목록</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full">
                ✕
              </button>
            </div>
            {chatHistory.length === 0 ? (
              <p className="text-slate-500 text-center py-8">이전 질문이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((item, i) => (
                  <div 
                    key={item._id || i} 
                    onClick={() => handleHistoryClick(item.content)}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer relative"
                  >
                    <p className="text-sm text-slate-700 line-clamp-2 pr-8">{item.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.createdAt?.split('T')[0] || ''}</p>
                    <button 
                      onClick={(e) => handleDeleteHistory(e, item._id)}
                      className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 채팅 영역 - 전체 화면 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl text-xl whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              {msg.role === 'user' ? msg.content : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl bg-slate-100">
              <span className="animate-pulse">입력 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 하단 입력창 */}
      <div className="sticky bottom-0 w-full bg-white border-t px-4 py-4">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-2">
          <button 
            onClick={() => { fetchChatHistory(); setShowHistory(true); }}
            className="p-4 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-2xl transition"
            title="이전 질문 보기"
          >
            <History size={20} />
          </button>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="건강에 대해 질문하세요..."
            className="flex-1 p-4 bg-slate-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            disabled={loading}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={loading || !input.trim()}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>로딩 중...</p></div>}>
      <ChatContent />
    </Suspense>
  );
}