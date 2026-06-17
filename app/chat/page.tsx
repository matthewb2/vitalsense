"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/authStore';
import Header from '@/app/components/ChatHeader';
import { useSwipeNavigate } from '@/app/components/useSwipeNavigate';
import { useChatStore, Message } from '@/store/chatStore';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  
// ... ChatContent 내부
const { messages, setMessages } = useChatStore();


  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useSwipeNavigate(undefined, '/blood-pressure');

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
  
  // 2. 키보드 리사이즈를 감지하는 useEffect 추가
useEffect(() => {
  if (typeof window === 'undefined' || !window.visualViewport) return;

  const handleResize = () => {
    if (window.visualViewport) {
      // 키보드가 올라오면 입력창이 가려지지 않도록 스크롤을 맨 아래로 강제 이동
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  window.visualViewport.addEventListener('resize', handleResize);
  window.visualViewport.addEventListener('scroll', handleResize);

  return () => {
    window.visualViewport?.removeEventListener('resize', handleResize);
    window.visualViewport?.removeEventListener('scroll', handleResize);
  };
}, []);

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

  const extractKeywords = async (text: string) => {
    try {
      const res = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.ok && data.keywords) {
        console.log('[키워드 추출]', data.keywords);
        localStorage.setItem('vitalsense_latest_symptoms', JSON.stringify(data.keywords));
        console.log('[키워드 저장] vitalsense_latest_symptoms:', JSON.stringify(data.keywords));
      }
    } catch (err) {
      console.error('[키워드 추출 오류]', err);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
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

      // Groq로 키워드 추출 요청
      extractKeywords(userMessage);

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
    <div className="h-dvh w-full bg-white flex flex-col overflow-hidden">
      {/* 스크롤 영역 (헤더 + 메시지) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <Header onMenuClick={() => { fetchChatHistory(); setShowHistory(true); }} />

        {/* 히스토리 사이드바 */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowHistory(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">이전 질문</h2>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {chatHistory.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">이전 질문이 없습니다.</p>
              ) : (
                chatHistory.map((item, i) => (
                  <div 
                    key={item._id || i} 
                    onClick={() => handleHistoryClick(item.content)}
                    className="p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition group"
                  >
                    <p className="text-sm text-slate-700 line-clamp-2">{item.content}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-slate-400">{item.createdAt?.split('T')[0] || ''}</p>
                      <button 
                        onClick={(e) => handleDeleteHistory(e, item._id)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 채팅 영역 */}
      <div className="px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] p-4 rounded-2xl whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white text-lg'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose max-w-none text-lg">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="text-lg leading-relaxed mb-4">
                          {children}
                        </p>
                      ),
                      li: ({ children }) => (
                        <li className="text-lg leading-relaxed">
                          {children}
                        </li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-3lg font-bold mb-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2lg font-bold mb-3">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-bold mb-2">
                          {children}
                        </h3>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl bg-slate-100 text-xl">
              <span className="animate-pulse">입력 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* 하단 입력창 */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="relative flex items-end gap-0 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="건강에 대해 질문하세요..."
              className="flex-1 min-w-0 max-h-48 p-4 bg-transparent border-0 outline-none text-base resize-none"
              disabled={loading}
              rows={Math.max(1, Math.min(input.split('\n').length, 8))}
            />
            <div className="flex items-center gap-0.5 pr-2 pb-2 shrink-0">
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-black text-white rounded-xl hover:opacity-80 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
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