'use client';

import { Bot, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatWidget() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={20} className="text-emerald-500" />
          <span className="font-semibold text-slate-800">AI 건강 상담</span>
        </div>

        <button
          onClick={() => router.push('/chat')}
          className="w-full flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:shadow-md transition cursor-pointer border border-slate-100"
        >
          <Search size={20} className="text-slate-400 shrink-0" />
          <span className="text-slate-400 text-sm">건강에 대해 질문하세요...</span>
        </button>
      </div>
    </div>
  );
}
