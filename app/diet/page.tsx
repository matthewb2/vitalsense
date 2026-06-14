"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image'
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import DietEditModal from '../components/DietEditModal';
import { useSwipeNavigate } from '../components/useSwipeNavigate';
import { Utensils, Clock, Plus, List, Trash2, Edit2, X, ImagePlus, Camera, Loader2, Flame } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<FoodRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mealType: 'breakfast' as MealType,
    content: '',
    calories: '',
    images: [] as string[],
  });
  const [editModal, setEditModal] = useState<{open: boolean; item: FoodRecord | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ date: '', mealType: 'breakfast' as MealType, content: '', calories: '', image: null as string | null });
  
  // AI 분석 상태 관리
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{food_name: string; calories: number}[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [imageIndexMap, setImageIndexMap] = useState<Record<number, number>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'vitalsense-image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

// Groq API 이미지 분석 함수
  const analyzeImage = async (base64Image: string): Promise<{food_name: string; calories: number} | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || !base64Image) {
      console.warn('[AI] GROQ_API_KEY가 설정되지 않았습니다.');
      return null;
    }

    try {
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
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        let cleanContent = content.trim();
        if (!cleanContent.startsWith('{')) {
          const braceStart = cleanContent.indexOf('{');
          if (braceStart >= 0) cleanContent = cleanContent.substring(braceStart);
        }
        if (!cleanContent.endsWith('}')) {
          const braceEnd = cleanContent.lastIndexOf('}');
          if (braceEnd >= 0) cleanContent = cleanContent.substring(0, braceEnd + 1);
        }
        const parsed = JSON.parse(cleanContent);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[AI] 분석 중 오류 발생:', error);
      return null;
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
    const files = Array.from(e.target.files || []).reverse();
    if (files.length === 0) return;
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...compressed] }));
      
      setAnalyzing(true);
      let total = totalCalories;
      const newResults: {food_name: string; calories: number}[] = [];
      
      for (const img of compressed) {
        const base64Only = img.split(',')[1];
        const result = await analyzeImage(base64Only);
        if (result && result.calories) {
          newResults.push(result);
          total += result.calories;
        }
      }
      
      setAnalysisResults(prev => [...prev, ...newResults]);
      setTotalCalories(total);
      setFormData(prev => ({ ...prev, calories: String(total) }));
      setAnalyzing(false);
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      setAnalyzing(false);
    }
  };
  
  useSwipeNavigate('/bmi', '/exercise');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?._id) {
      const token = user?.token?.accessToken || user?.accessToken;
      if (token) fetchHistory(token);
    }
  }, [user?._id, user?.token]);

  const fetchHistory = async (token: string, silent = false) => {
    if (!silent) setHistoryLoading(true);
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
        const parseExtra = (item: any) => {
          if (typeof item.extra === 'string') { try { return JSON.parse(item.extra); } catch { return {}; } }
          return item.extra || {};
        };
        const filtered = data.item.filter((item: any) => {
          const ex = parseExtra(item);
          return ex.userId === userId || item.user?._id === userId;
        });
        const parsed = filtered.map((item: any) => {
          const extra = parseExtra(item);
          let mealType = extra.mealType || 'other';
          if (mealType === 'other' && item.title) {
            if (item.title.startsWith('아침')) mealType = 'breakfast';
            else if (item.title.startsWith('점심')) mealType = 'lunch';
            else if (item.title.startsWith('저녁')) mealType = 'dinner';
          }
          const contentCalories = item.content.match(/칼로리:\s*(\d+)kcal/);
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            mealType: mealType,
            content: item.content,
            calories: extra.calories?.toString() || (contentCalories ? contentCalories[1] : ''),
            image: item.image || null,
          };
        });
        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      if (!silent) setHistoryLoading(false);
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
      let imagePaths: string[] = [];
      if (formData.images.length > 0) {
        for (const img of formData.images) {
          if (!img.startsWith('data:')) continue;
          const base64Data = img.split(',')[1];
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
            imagePaths.push(fullPath.split('/').pop());
          }
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
          image: imagePaths.length > 0 ? imagePaths.join(',') : null,
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
          images: [],
        });
        setAnalysisResults([]);
        setTotalCalories(0);
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      
      <main className="max-w-md mx-auto mt-4">
        		
		        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 w-fit mx-auto border border-slate-200">
          <TabButton 
            active={activeTab === 'list'} 
            onClick={() => setActiveTab('list')} 
            icon={<List size={18} />} 
            label="기록 목록" 
          />
          <TabButton 
            active={activeTab === 'record'} 
            onClick={() => setActiveTab('record')} 
            icon={<Plus size={18} />} 
            label="식사 기록" 
          />
        </div>

        {activeTab === 'list' ? (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} /> 데이터를 가져오는 중...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">기록된 식사 데이터가 없습니다.</div>
            ) : (
              <><div className="space-y-4">
                {history.slice(0, visibleCount).map((item) => (
                  <div key={item._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    {/* 상단: 날짜 및 식사 유형 */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-slate-500">{item.date}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${mealColors[item.mealType]}`}>
                        {mealLabels[item.mealType]}{item.calories ? ` · ${item.calories}kcal` : ''}
                      </span>
                    </div>
                    
                    {/* 이미지 (있을 경우) */}
                    {item.image && (() => {
                      const images = item.image!.split(',').filter(Boolean);
                      const currentIdx = imageIndexMap[item._id] || 0;
                      const src = getImageUrl(images[currentIdx]);
                      return (
                        <div data-no-page-swipe className="mb-3 rounded-xl overflow-hidden relative group cursor-pointer" onClick={() => setLightboxImage(src)}
                          onTouchStart={(e) => { const t = e.touches[0]; (e.currentTarget as any).__sx = t.clientX; (e.currentTarget as any).__sy = t.clientY; }}
                          onTouchEnd={(e) => {
                            if (images.length < 2) return;
                            const t = e.changedTouches[0];
                            const dx = t.clientX - ((e.currentTarget as any).__sx ?? t.clientX);
                            const dy = t.clientY - ((e.currentTarget as any).__sy ?? t.clientY);
                            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                              if (dx < 0 && currentIdx < images.length - 1) setImageIndexMap(p => ({ ...p, [item._id]: currentIdx + 1 }));
                              if (dx > 0 && currentIdx > 0) setImageIndexMap(p => ({ ...p, [item._id]: currentIdx - 1 }));
                            }
                          }}
                        >
                          {images.length > 1 && (
                            <>
                              {currentIdx > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setImageIndexMap(prev => ({ ...prev, [item._id]: currentIdx - 1 })); }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition hidden md:block"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                                </button>
                              )}
                              {currentIdx < images.length - 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setImageIndexMap(prev => ({ ...prev, [item._id]: currentIdx + 1 })); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition hidden md:block"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                              )}
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                                {images.map((_, dotIdx) => (
                                  <button key={dotIdx} onClick={(e) => { e.stopPropagation(); setImageIndexMap(prev => ({ ...prev, [item._id]: dotIdx })); }}
                                    className={`w-2 h-2 rounded-full transition ${dotIdx === currentIdx ? 'bg-white' : 'bg-white/40'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                          {src && <Image src={src} alt="food" width={300} height={200} className="w-full h-48 object-cover" />}
                        </div>
                      );
                    })()}
                    
                    {/* 메뉴 */}
                    <p className="text-slate-700 mb-3">{item.content.split('\n')[1]?.split(': ')[1] || ''}</p>
                    
                    {/* 하단: 관리 버튼 */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => handleEdit(item)} className="flex-1 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition text-sm font-medium">수정</button>
                      <button onClick={() => handleDelete(item)} className="flex-1 py-2 text-red-400 hover:bg-red-50 rounded-lg transition text-sm font-medium">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
              {visibleCount < history.length ? (
                <div className="text-center pt-4">
                  <button onClick={() => setVisibleCount(prev => prev + 5)} 
                    className="text-sm text-green-600 hover:text-green-800 font-bold py-2 px-6 hover:bg-green-50 rounded-xl transition"
                  >
                      ({(history.length - visibleCount) > 5 ? 5 : (history.length - visibleCount)}개 더보기)
                  </button>
                </div>
              ) : history.length > 0 ? (
                <div className="text-center pt-4">
                  <span className="text-sm text-slate-400 font-medium">
                    마지막 기록입니다. (총 {history.length}개)
                  </span>
                </div>
              ) : null}</>
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
                  {formData.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-xl border-2 border-green-500 shadow-sm" />
                          <button type="button" onClick={() => { 
                            setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) })); 
                            const removed = analysisResults.find((_, i) => i === idx);
                            if (removed) {
                              setTotalCalories(prev => Math.max(0, prev - removed.calories));
                              setAnalysisResults(prev => prev.filter((_, i) => i !== idx));
                            }
                          }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md group-hover:scale-110 transition"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 분석 상태 및 결과 표시 */}
                  {analyzing && (
                    <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 animate-pulse">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-bold">AI 분석 중...</span>
                    </div>
                  )}
                  
                  {analysisResults.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex flex-col justify-center shadow-sm">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">AI Result</span>
                      <div className="space-y-0.5">
                        {analysisResults.map((r, i) => (
                          <p key={i} className="text-xs text-emerald-600">
                            #{i + 1}. {r.food_name}: {r.calories}kcal
                          </p>
                        ))}
                        <div className="text-sm font-bold text-emerald-700 border-t border-emerald-200 pt-0.5 mt-0.5">
                          합계: {totalCalories} kcal
                        </div>
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

        {/* 수정 모달 */}
        <DietEditModal 
          open={editModal.open} 
          item={editModal.item}
          form={editForm}
          onFormChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
          onClose={() => setEditModal({ open: false, item: null })}
          onSave={handleUpdate}
          onImageChange={handleEditImageChange}
        />

        {/* 라이트박스 */}
        {lightboxImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-w-2xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <Image src={lightboxImage} alt="preview" width={800} height={600} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleDownload(lightboxImage)} className="bg-white/20 backdrop-blur-sm text-white rounded-full p-2 hover:bg-white/40 transition" title="다운로드">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button onClick={() => setLightboxImage(null)} className="bg-white/20 backdrop-blur-sm text-white rounded-full p-2 hover:bg-white/40 transition" title="닫기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}