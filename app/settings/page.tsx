"use client";

import React, { useState } from 'react';
import { Settings, Key, Save, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Link from 'next/link';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />

      <main className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Settings className="text-blue-600" />
            설정
          </h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                OpenAI API 키를 입력하면 AI 건강 분석 기능을 사용할 수 있습니다.
              </p>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Save size={20} />
              저장
            </button>

            {saved && (
              <div className="text-center text-green-600 font-medium">
                저장되었습니다!
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowLeft size={20} />
          메인으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
