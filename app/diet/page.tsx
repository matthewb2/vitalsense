"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { Utensils, Clock, Plus, List, Trash2, Edit2, X, ImagePlus, Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

const API_URL = '/api/posts';
const IMAGE_HOST_URL = 'http://mksolution.dothome.co.kr/images';

const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${IMAGE_HOST_URL}/${imagePath}`;
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'other';

interface FoodRecord {
  _id: number;
  date: string;
  mealType: MealType;
  content: string;
  calories?: string;
  image?: string | null;
}

const mealLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  other: '기타',
};

const mealColors: Record<MealType, string> = {
  breakfast: 'bg-amber-100 text-amber-600',
  lunch: 'bg-green-100 text-green-600',
  dinner: 'bg-blue-100 text-blue-600',
  other: 'bg-purple-100 text-purple-600',
};

export default function DietPage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<FoodRecord[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mealType: 'breakfast' as MealType,
    content: '',
    calories: '',
    image: null as string | null,
  });
  const [editModal, setEditModal] = useState<{open: boolean; item: FoodRecord | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ date: '', mealType: 'breakfast' as MealType, content: '', calories: '', image: null as string | null });
  
  // AI 분석 상태 관리
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{food_name: string; calories: number} | null>(null);

// Groq API 이미지 분석 함수
  const analyzeImage = async (base64Image: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    console.log('[AI] API Key loaded:', apiKey ? 'YES' : 'NO');
    console.log('[AI] base64Image length:', base64Image?.length);
    if (!apiKey || !base64Image) {
      console.warn('[AI] GROQ_API_KEY가 설정되지 않았습니다.');
      return;
    }
    console.log('[AI] 이미지 분석 시작...');
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      console.log('[AI] Groq API 요청 전송 중...', { model: 'meta-llama/llama-4-scout-17b-16e-instruct' });
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this food image and estimate calories. Response MUST be valid JSON: {\"calories\": 350, \"food_name\": \"duck\"}. Use ONLY ASCII characters, no special characters." },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI] Groq API Error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AI] Groq API Response raw:', data);
      const content = data.choices?.[0]?.message?.content;
      console.log('[AI] Groq API content raw:', content);
      if (content) {
        try {
          let cleanContent = content.trim();
          if (!cleanContent.startsWith('{')) {
            const braceStart = cleanContent.indexOf('{');
            if (braceStart >= 0) cleanContent = cleanContent.substring(braceStart);
          }
          if (!cleanContent.endsWith('}')) {
            const braceEnd = cleanContent.lastIndexOf('}');
            if (braceEnd >= 0) cleanContent = cleanContent.substring(0, braceEnd + 1);
          }
          console.log('[AI] Cleaned content:', cleanContent);
          const parsed = JSON.parse(cleanContent);
          console.log('[AI] 분석 결과:', parsed);
          setAnalysisResult(parsed);
          if (parsed.calories) {
            setFormData(prev => ({ ...prev, calories: String(parsed.calories) }));
            console.log('[AI] 칼로리 자동 입력:', parsed.calories);
          }
        } catch (parseError) {
          console.error('[AI] JSON parse error:', parseError, "Content:", content);
        }
      }
    } catch (error) {
      console.error('[AI] 분석 중 오류 발생:', error);
    } finally {
      setAnalyzing(false);
      console.log('[AI] 분석 완료');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, image: compressed }));
      
      // 이미지 선택 즉시 분석 시작
      const base64Only = compressed.split(',')[1];
      await analyzeImage(base64Only);
    } catch (error) {
      console.error('이미지 처리 오류:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?._id) {
      const token = user?.token?.accessToken || user?.accessToken;
      if (token) fetchHistory(token);
    }
  }, [user?._id, user?.token]);

  const fetchHistory = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}?type=diet`, {
        method: 'GET',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      if (data.ok && data.item) {
        const userId = user?._id;
        const filtered = data.item.filter((item: any) => item.user?._id === userId);
        const parsed = filtered.map((item: any) => {
          let mealType = item.extra?.mealType || 'other';
          if (mealType === 'other' && item.title) {
            if (item.title.startsWith('아침')) mealType = 'breakfast';
            else if (item.title.startsWith('점심')) mealType = 'lunch';
            else if (item.title.startsWith('저녁')) mealType = 'dinner';
          }
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            mealType: mealType,
            content: item.content,
            calories: item.extra?.calories?.toString() || '',
            image: item.image ? getImageUrl(item.image) : null,
          };
        });
        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    setLoading(true);

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;
    if (!currentToken) { setLoading(false); return; }

    try {
      let imagePath = null;
      if (formData.image && formData.image.startsWith('data:')) {
        const base64Data = formData.image.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const fileFormData = new FormData();
        fileFormData.append('file', blob, `diet_${Date.now()}.jpg`);

        const fileResponse = await fetch('/api/files', {
          method: 'POST',
          headers: {
            'client-id': 'vitalsense',
            'Authorization': `Bearer ${currentToken}`
          },
          body: fileFormData,
        });

        const fileData = await fileResponse.json();
        const fullPath = fileData.path || fileData.item?.[0]?.path || fileData.url;
        if (fullPath) {
          imagePath = fullPath.split('/').pop();
        }
      }

      const calorieInfo = formData.calories ? `\n(칼로리: ${formData.calories}kcal)` : "";
      const finalContent = `측정 일시: ${formData.date}\n${mealLabels[formData.mealType]}: ${formData.content}${calorieInfo}`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'diet',
          title: `${mealLabels[formData.mealType]} - ${formData.content.slice(0, 20)}`,
          content: finalContent,
          image: imagePath,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            mealType: formData.mealType,
            calories: formData.calories || null
          },
        }),
      });

      if (response.ok) {
        setSaved(true);
        fetchHistory(currentToken);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          mealType: 'breakfast',
          content: '',
          calories: '',
          image: null,
        });
        setAnalysisResult(null);
        setTimeout(() => {
          setSaved(false);
          setActiveTab('list');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: FoodRecord) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;
    if (!currentToken) return;

    try {
      await fetch(`${API_URL}?id=${item._id}`, {
        method: 'DELETE',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
      });
      fetchHistory(currentToken);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleEdit = (item: FoodRecord) => {
    const content = item.content.split('\n')[1]?.split(': ')[1] || '';
    const calories = item.calories?.toString() || '';
    setEditForm({
      date: item.date,
      mealType: item.mealType,
      content: content,
      calories: calories,
      image: item.image || null,
    });
    setEditModal({ open: true, item });
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setEditForm(prev => ({ ...prev, image: compressed }));
    } catch (error) {
      console.error('Image compression error:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editModal.item) return;
    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;
    if (!currentToken) return;

    try {
      let imageValue = editForm.image;
      const isNewImage = editForm.image && editForm.image.startsWith('data:image');

      if (isNewImage) {
        const base64Data = editForm.image!.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const uploadFormData = new FormData();
        uploadFormData.append('file', blob, 'image.jpg');

        const uploadResponse = await fetch('/api/files', {
          method: 'POST',
          headers: {
            'client-id': 'vitalsense',
            'Authorization': `Bearer ${currentToken}`
          },
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json();
        const fullPath = uploadResult.path || uploadResult.item?.[0]?.path || uploadResult.url;
        imageValue = fullPath ? fullPath.split('/').pop() : null;
      }

      await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          id: editModal.item._id,
          type: 'diet',
          title: `${mealLabels[editForm.mealType as MealType]} - ${editForm.content.slice(0, 20)}`,
          content: `측정 일시: ${editForm.date}\n${mealLabels[editForm.mealType as MealType]}: ${editForm.content}${editForm.calories ? `\n(칼로리: ${editForm.calories}kcal)` : ''}`,
          image: imageValue,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            mealType: editForm.mealType,
            calories: editForm.calories || null
          },
        }),
      });

      setEditModal({ open: false, item: null });
      fetchHistory(currentToken);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
        active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <Header />
      <Navigation />
      <main className="max-w-2xl mx-auto mt-6">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 w-fit mx-auto border border-slate-200">
          <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon={<List size={18} />} label="기록 목록" />
          <TabButton active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<Plus size={18} />} label="식사 기록" />
        </div>

        {activeTab === 'list' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">기록된 식사 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-4">날짜</th>
                      <th className="p-4">식사</th>
                      <th className="p-4">메뉴</th>
                      <th className="p-4">사진</th>
                      <th className="p-4">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-medium">{item.date}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${mealColors[item.mealType]}`}>
                            {mealLabels[item.mealType]}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 truncate max-w-[150px]">{item.content.split('\n')[1]?.split(': ')[1] || ''}</td>
                        <td className="p-4">
                          {item.image && (
                            <Image src={item.image} alt="food" width={48} height={48} className="w-12 h-12 object-cover rounded-lg border" />
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(item)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2"><Utensils size={24} /> 식사 기록</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Clock size={14} /> 날짜</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">식사 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'other'] as MealType[]).map((type) => (
                    <button key={type} type="button" onClick={() => setFormData({...formData, mealType: type})} className={`p-3 rounded-xl text-sm font-bold transition ${formData.mealType === type ? mealColors[type] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{mealLabels[type]}</button>
                  ))}
                </div>
              </div>
<div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">메뉴</label>
                <textarea placeholder="예: 삼겹살, 채소 소스, 밥 한 공기" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">칼로리 (kcal)</label>
                <input type="number" placeholder="예: 500" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500" value={formData.calories} onChange={(e) => setFormData({...formData, calories: e.target.value})} />
              </div>
               
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Camera size={14} /> 사진 업로드 & 칼로리 분석</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition border-dashed">
                    <ImagePlus size={20} className="text-slate-500" />
                    <span className="text-sm text-slate-600 font-medium">사진 선택</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>

                  {/* 사진 미리보기 */}
                  {formData.image && (
                    <div className="relative group">
                      <img src={formData.image} alt="preview" className="w-16 h-16 object-cover rounded-xl border-2 border-green-500 shadow-sm" />
                      <button type="button" onClick={() => { setFormData(prev => ({ ...prev, image: null })); setAnalysisResult(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md group-hover:scale-110 transition"><X size={12} /></button>
                    </div>
                  )}

                  {/* 분석 상태 및 결과 표시 */}
                  {analyzing && (
                    <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 animate-pulse">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-bold">AI 분석 중...</span>
                    </div>
                  )}
                  
                  {analysisResult && (
                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex flex-col justify-center shadow-sm">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">AI Result</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-emerald-700">{analysisResult.calories}</span>
                        <span className="text-[10px] text-emerald-600 font-medium pt-0.5">kcal</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading || !formData.content.trim()} className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 shadow-lg shadow-green-200 transition disabled:opacity-50">
                {saved ? '저장 완료!' : loading ? '저장 중...' : '식사 기록 저장하기'}
              </button>
            </form>
          </div>
        )}

        {/* 수정 모달 영역 */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">식단 기록 수정</h3>
                <button onClick={() => setEditModal({open: false, item: null})} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">날짜</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">식사 유형</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['breakfast', 'lunch', 'dinner', 'other'] as MealType[]).map((type) => (
                      <button key={type} type="button" onClick={() => setEditForm({...editForm, mealType: type})} className={`p-2 rounded-xl text-sm font-bold transition ${editForm.mealType === type ? mealColors[type] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{mealLabels[type]}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">메뉴</label>
                  <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-20 outline-none focus:ring-2 focus:ring-green-500" value={editForm.content} onChange={(e) => setEditForm({...editForm, content: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">칼로리 (kcal)</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={editForm.calories} onChange={(e) => setEditForm({...editForm, calories: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Camera size={14} /> 사진 변경</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                      <ImagePlus size={20} className="text-slate-500" /><span className="text-sm text-slate-600">사진 선택</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
                    </label>
                    {editForm.image && (
                      <div className="relative group">
                        <img src={getImageUrl(editForm.image) || ""} alt="preview" className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                        <button type="button" onClick={() => setEditForm(prev => ({ ...prev, image: null }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={handleUpdate} className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition shadow-md">수정 사항 저장</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}