"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/ChatHeader';

const initialMessages = [
  { role: 'ai', content: '안녕하세요! 저는 바이탈센스 에이전트입니다. 건강에 관한 무엇이든 물어보세요. 혈당, 혈압, 식단, 운동 등 다양한 건강 정보를 알려드릴 수 있습니다.' }
];

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
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
      setMessages([...newMessages, { role: 'ai', content: data.content }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'ai', content: '죄송합니다. 응답을 생성하는 데 오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* 채팅 영역 - 전체 화면 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-base whitespace-pre-wrap ${
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
      <div className="sticky bottom-0 bg-white border-t px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="건강에 대해 질문하세요..."
            className="flex-1 p-4 bg-slate-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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