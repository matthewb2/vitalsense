"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/authStore';
import Header from '@/app/components/ChatHeader';
import { useSwipeNavigate } from '@/app/components/useSwipeNavigate';
import ChatHistorySidebar from '@/components/ChatHistorySidebar';
import { useChatStore, Message } from '@/store/chatStore';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, checkAuth } = useAuthStore();
  const { messages, setMessages } = useChatStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  // 요소 제어를 위한 Ref
  const containerRef = useRef<HTMLDivElement>(null); 
  const inputWrapperRef = useRef<HTMLDivElement>(null); 
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

  // 메시지나 로딩 상태가 바뀔 때 하단 스크롤
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
  
// 오직 하단 입력창만 가상 키보드 위로 올리는 Visual Viewport 제어
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const adjustInputPosition = () => {
      if (!window.visualViewport || !inputWrapperRef.current || !containerRef.current) return;
      
      const vv = window.visualViewport;
      // 전체 화면(window.innerHeight)에서 현재 보이는 뷰포트 높이를 빼면 키보드 높이가 나옵니다.
      const keyboardHeight = window.innerHeight - vv.height;
      
      if (keyboardHeight > 0) {
        // 키보드가 올라왔을 때: 입력창만 키보드 높이만큼 위로 밀어 올립니다.
        // vv.offsetTop을 더해 iOS 브라우저 상단바 등으로 인한 밀림 현상을 정밀 보정합니다.
        inputWrapperRef.current.style.transform = `translateY(-${keyboardHeight - vv.offsetTop}px)`;
      } else {
        // 키보드가 닫혔을 때: 원래 위치(제자리)로 돌려놓습니다.
        inputWrapperRef.current.style.transform = 'translateY(0)';
      }
    };

    const handleResize = () => {
      adjustInputPosition();
      // 입력 도중 화면 아래가 가려지지 않도록 스크롤 유지
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    // 초기 실행 및 이벤트 바인딩
    adjustInputPosition();
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

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

        // 검색어 히스토리 관리 (최대 10개)
        const primary = data.keywords.symptoms?.[0] || text;
        if (primary) {
          const history = JSON.parse(localStorage.getItem('vitalsense_search_history') || '[]');
          if (!history.includes(primary)) {
            history.unshift(primary);
            if (history.length > 10) history.pop();
            localStorage.setItem('vitalsense_search_history', JSON.stringify(history));
          }
        }

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
      
      let aiResponse = '';
      if (!response.ok || data.error) {
        aiResponse = data.error || '오류가 발생했습니다.';
      } else {
        aiResponse = data.content;
      }

      setMessages([...newMessages, { role: 'ai', content: aiResponse }]);
      extractKeywords(userMessage);

      const currentToken = user?.token?.accessToken || user?.accessToken;
      if (currentToken) {
        const qaMessages = [...newMessages, { role: 'ai', content: aiResponse }]
          .filter((msg) => !(msg.role === 'ai' && msg.content.startsWith('안녕하세요! 저는 바이탈센스')))
          .map(msg => msg.role === 'user' ? `Q. ${msg.content}` : `A. ${msg.content}`)
          .join('\n\n');
        const updatedContent = qaMessages.slice(0, 2000);

        if (currentPostId) {
          console.log('[Chat] PATCH existing post:', currentPostId, 'content length:', updatedContent.length);
          const patchRes = await fetch('/api/posts', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'client-id': 'vitalsense',
              'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
              id: currentPostId,
              title: messages[0]?.content?.slice(0, 50) || userMessage.slice(0, 50),
              content: updatedContent,
            }),
          });
          const patchData = await patchRes.json();
          console.log('[Chat] PATCH response:', patchData);
        } else {
          console.log('[Chat] POST new post, content:', updatedContent);
          const createRes = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-id': 'vitalsense',
              'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
              type: 'chat',
              title: userMessage.slice(0, 50),
              content: updatedContent,
              extra: { userId: user?._id, userName: user?.name }
            }),
          });
          const createData = await createRes.json();
          console.log('[Chat] POST response:', createData);
          if (createData.ok && createData.item?._id) {
            setCurrentPostId(createData.item._id);
          }
        }
        fetchChatHistory();
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'ai', content: '죄송합니다. 응답을 생성하는 데 오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentPostId(null);
  };

  return (
    <div ref={containerRef} className="w-full bg-white flex flex-col overflow-hidden fixed inset-0">
      <ChatHistorySidebar
        open={showHistory}
        items={chatHistory}
        onClose={() => setShowHistory(false)}
        onItemClick={(item) => { setInput(item.content); setCurrentPostId(item._id); setShowHistory(false); }}
        onDelete={handleDeleteHistory}
        onNewChat={handleNewChat}
      />

{/* [본문 레이아웃 고정] 키보드가 켜져도 이 박스의 크기는 절대 변하지 않습니다. */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white pb-32">
        {/* 1. 상단 헤더 (sticky, 반투명) */}
        <Header onMenuClick={() => { fetchChatHistory(); setShowHistory(true); }} onNewChat={handleNewChat} />

        {/* 2. 채팅 메시지 */}
        <div className="px-4 py-4 space-y-4">
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
                      p: ({ children }) => <p className="text-lg leading-relaxed mb-4">{children}</p>,
                      li: ({ children }) => <li className="text-lg leading-relaxed">{children}</li>,
                      h1: ({ children }) => <h1 className="text-3lg font-bold mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2lg font-bold mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
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

      {/* 3. 하단 입력창 고정 */}
      {/* [하단 입력창 고정 레이어] 본문 위에 덮어씌워져 있으며, 오직 이 레이어만 Y축으로 움직입니다. */}
      <div 
        ref={inputWrapperRef} 
        className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-slate-100 z-30 transition-transform duration-100 ease-out will-change-transform"
      >
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