"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Activity, Heart, Droplets, Utensils, Send } from 'lucide-react';
import Header from './components/Header';
import ReactMarkdown from 'react-markdown';

const initialMessages = [
  { role: 'ai', content: '안녕하세요! 저는 VitalSense AI 건강 분석기입니다. 건강에 관한 무엇이든 물어보세요. 혈당, 혈압, 식단, 운동 등 다양한 건강 정보를 알려드릴 수 있습니다.' }
];

export default function HealthDashboard() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    scrollToBottom();

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
      scrollToBottom();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 왼쪽: 생체 지표 카드 섹션 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 혈압 카드에 경로 추가 */}
            <HealthCard 
              title="혈압" 
              value="120/80" 
              unit="mmHg" 
              icon={<Heart className="text-red-500" />} 
              status="정상" 
              href="/blood-pressure" 
            />
            <HealthCard title="혈당" value="105" unit="mg/dL" icon={<Droplets className="text-blue-500" />} status="주의" color="text-orange-500" />
            <HealthCard title="체중" value="72.5" unit="kg" icon={<Activity className="text-green-500" />} status="유지" />
            <HealthCard title="BMI" value="23.1" unit="Index" icon={<Activity className="text-purple-500" />} status="정상" />
          </div>

          {/* 식단 및 운동 요약 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Utensils size={20} /> 오늘 하루 기록
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span>아침: 닭가슴살 샐러드, 현미밥</span>
                <span className="text-sm text-slate-400">08:30</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span>운동: 인터벌 러닝 30분</span>
                <span className="text-sm text-blue-500 font-medium">-420 kcal</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: AI 채팅 인터페이스 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-[600px]">
          <div className="p-4 border-b bg-blue-50 rounded-t-2xl flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-blue-700">AI 건강 분석가</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800 prose prose-sm max-w-none'
                }`}>
                  {msg.role === 'user' ? msg.content : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-slate-100">
                  <span className="animate-pulse">입력 중...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="relative flex items-center">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="상태를 물어보세요"
                className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleSendMessage} className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// 수정된 HealthCard 컴포넌트
function HealthCard({ title, value, unit, icon, status, color = "text-green-500", href }: any) {
  const CardContent = (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer h-full">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={`text-xs font-bold ${color}`}>{status}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{title} ({unit})</div>
    </div>
  );

  // href 속성이 있으면 Link로 감싸고, 없으면 그냥 출력
  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}