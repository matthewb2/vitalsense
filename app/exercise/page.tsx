"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '../components/Header';
import Navigation from '@/components/Navigation';
import { useSwipeNavigate } from '../components/useSwipeNavigate';
import { Dumbbell, Clock, Plus, List, Trash2, ArrowLeft, Flame, Edit2, X, ImagePlus, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const API_URL = '/api/posts';
const IMAGE_HOST_URL = 'http://mksolution.dothome.co.kr/images';

const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${IMAGE_HOST_URL}/${imagePath}`;
};

// 상대 시간을 계산해 주는 헬퍼 함수
const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const now = new Date();
  const past = new Date(dateString);
  
  // 날짜 변환이 올바르지 않은 경우 원본 문자열 반환
  if (isNaN(past.getTime())) return dateString;

  const diffInMilliSeconds = now.getTime() - past.getTime();
  const diffInSeconds = Math.floor(diffInMilliSeconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks}주일 전`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths}달 전`;
  } else {
    return `${diffInYears}년 전`;
  }
};

type ExerciseType = 'running' | 'walking' | 'swimming' | 'cycling' | 'weight' | 'yoga' | 'other';

interface ExerciseRecord {
  _id: number;
  date: string;
  exerciseType: ExerciseType;
  content: string;
  image?: string | null;
}

const exerciseLabels: Record<ExerciseType, string> = {
  running: '러닝',
  walking: '걷기',
  swimming: '수영',
  cycling: '자전거',
  weight: '헬스',
  yoga: '요가',
  other: '기타',
};

const caloriesPerMinute: Record<ExerciseType, number> = {
  running: 10,
  walking: 4,
  swimming: 11,
  cycling: 8,
  weight: 6,
  yoga: 3,
  other: 5,
};

const exerciseColors: Record<ExerciseType, string> = {
  running: 'bg-orange-100 text-orange-600',
  walking: 'bg-green-100 text-green-600',
  swimming: 'bg-blue-100 text-blue-600',
  cycling: 'bg-yellow-100 text-yellow-600',
  weight: 'bg-red-100 text-red-600',
  yoga: 'bg-purple-100 text-purple-600',
  other: 'bg-gray-100 text-gray-600',
};

export default function ExercisePage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<ExerciseRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exerciseType: 'running' as ExerciseType,
    duration: '',
    calories: '',
    content: '',
    images: [] as string[],
  });
  const [editModal, setEditModal] = useState<{open: boolean; item: ExerciseRecord | null}>({open: false, item: null});
  const [editForm, setEditForm] = useState({ date: '', exerciseType: 'running' as ExerciseType, duration: '', calories: '', content: '', image: null as string | null });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [imageIndexMap, setImageIndexMap] = useState<Record<number, number>>({});

  useSwipeNavigate('/diet', undefined);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?._id) {
      const token = user?.token?.accessToken || user?.accessToken;
      if (token) {
        fetchHistory(token);
      }
    }
  }, [user?._id, user?.token]);

  const fetchHistory = async (token: string, silent = false) => {
    if (!silent) setFetching(true);
    try {
      const response = await fetch(`${API_URL}?type=exercise`, {
        method: 'GET',
        headers: {
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      if (data.ok && data.item) {
        const userId = user?._id;
        const parseExtra = (item: any) => { if (typeof item.extra === 'string') { try { return JSON.parse(item.extra); } catch { return {}; } } return item.extra || {}; };
        const filtered = data.item.filter((item: any) => {
          const ex = parseExtra(item);
          return ex.userId === userId || item.user?._id === userId;
        });

        const parsed = filtered.map((item: any) => {
          const ex = parseExtra(item);
          let exerciseType = ex.exerciseType || 'other';
          
          if (exerciseType === 'other' && item.title) {
            if (item.title.startsWith('러닝')) exerciseType = 'running';
            else if (item.title.startsWith('걷기')) exerciseType = 'walking';
            else if (item.title.startsWith('수영')) exerciseType = 'swimming';
            else if (item.title.startsWith('자전거')) exerciseType = 'cycling';
            else if (item.title.startsWith('헬스')) exerciseType = 'weight';
            else if (item.title.startsWith('요가')) exerciseType = 'yoga';
          }
          
          return {
            _id: item._id,
            date: item.content.split('측정 일시: ')[1]?.split('\n')[0] || '',
            exerciseType: exerciseType,
            content: item.content,
            image: item.image || null,
          };
        });

        setHistory(parsed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      if (!silent) setFetching(false);
    }
  };

  const calculateCalories = () => {
    const duration = parseInt(formData.duration) || 0;
    if (duration > 0) {
      const calories = Math.round(duration * caloriesPerMinute[formData.exerciseType as ExerciseType]);
      setFormData(prev => ({ ...prev, calories: calories.toString() }));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, duration: e.target.value });
    setTimeout(calculateCalories, 100);
  };

  const handleTypeChange = (type: ExerciseType) => {
    setFormData({ ...formData, exerciseType: type });
    setTimeout(calculateCalories, 100);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...compressed] }));
    } catch (error) {
      console.error('Image processing error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exerciseType || !formData.duration) return;

    setLoading(true);

    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;

    if (!currentToken) {
      setLoading(false);
      return;
    }

    const contentText = formData.content 
      ? `\n메모: ${formData.content}` 
      : '';

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
          fileFormData.append('file', blob, `exercise_${Date.now()}.jpg`);

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

      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          type: 'exercise',
          title: `${exerciseLabels[formData.exerciseType as ExerciseType]} - ${formData.duration}분${formData.calories ? ` (${formData.calories}kcal)` : ''}`,
          content: `측정 일시: ${formData.date}\n운동: ${exerciseLabels[formData.exerciseType as ExerciseType]}\n시간: ${formData.duration}분${formData.calories ? `\n소모 칼로리: ${formData.calories}kcal` : ''}${contentText}`,
          image: imagePaths.length > 0 ? imagePaths.join(',') : null,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            exerciseType: formData.exerciseType,
            duration: formData.duration,
            calories: formData.calories,
          },
        }),
      });

      setSaved(true);
      fetchHistory(currentToken);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        exerciseType: 'running',
        duration: '',
        calories: '',
        content: '',
        images: [],
      });
      
      setTimeout(() => {
        setSaved(false);
        setActiveTab('list');
      }, 1500);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ExerciseRecord) => {
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

  const handleEdit = (item: ExerciseRecord) => {
    const durationMatch = item.content.match(/시간: (\d+)분/);
    const caloriesMatch = item.content.match(/소모 칼로리: (\d+)kcal/);
    const contentMatch = item.content.match(/메모: (.+)/);
    
    setEditForm({
      date: item.date,
      exerciseType: item.exerciseType,
      duration: durationMatch ? durationMatch[1] : '',
      calories: caloriesMatch ? caloriesMatch[1] : '',
      content: contentMatch ? contentMatch[1] : '',
      image: item.image || null,
    });
    setEditModal({ open: true, item });
  };

  const handleUpdate = async () => {
    if (!editModal.item) return;
    
    const currentUser = useAuthStore.getState().user;
    const currentToken = currentUser?.token?.accessToken || currentUser?.accessToken;
    
    if (!currentToken) return;
    
    try {
      await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'client-id': 'vitalsense',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          id: editModal.item._id,
          type: 'exercise',
          title: `${exerciseLabels[editForm.exerciseType as ExerciseType]} - ${editForm.duration}분${editForm.calories ? ` (${editForm.calories}kcal)` : ''}`,
          content: `측정 일시: ${editForm.date}\n운동: ${exerciseLabels[editForm.exerciseType as ExerciseType]}\n시간: ${editForm.duration}분${editForm.calories ? `\n소모 칼로리: ${editForm.calories}kcal` : ''}${editForm.content ? `\n메모: ${editForm.content}` : ''}`,
          extra: { 
            userId: user?._id, 
            userName: user?.name,
            exerciseType: editForm.exerciseType,
            duration: editForm.duration,
            calories: editForm.calories,
          },
        }),
      });
      
      setEditModal({ open: false, item: null });
      fetchHistory(currentToken);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, ExerciseRecord[]>);

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
            label="운동 기록"
          />
        </div>

        {activeTab === 'list' ? (
          <div>
            {fetching ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} /> 데이터를 가져오는 중...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">기록된 운동 데이터가 없습니다.</div>
            ) : (
              <><div className="space-y-4">
                {history.slice(0, visibleCount).map((item) => {
                  const match = item.content.match(/시간: (\d+)분/);
                  const caloriesMatch = item.content.match(/소모 칼로리: (\d+)kcal/);
                  const contentMatch = item.content.match(/메모: (.+)/);
                  const duration = match ? match[1] : '';
                  const calories = caloriesMatch ? caloriesMatch[1] : '';
                  const memo = contentMatch ? contentMatch[1] : '';
                  return (
                    <div key={item._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                      {/* 상단: 날짜 및 운동 유형 */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-slate-500">{formatRelativeTime(item.date)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${exerciseColors[item.exerciseType as ExerciseType]}`}>
                          {exerciseLabels[item.exerciseType as ExerciseType]}{calories ? ` · ${calories}kcal` : ''}
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
                            {src && <Image src={src} alt="exercise" width={300} height={200} className="w-full h-48 object-cover" />}
                          </div>
                        );
                      })()}
                      
                      {/* 운동 상세 */}
                      <div className="space-y-1 mb-3">
                        {duration && <p className="text-slate-700"><span className="font-medium">시간:</span> {duration}분</p>}
                        {calories && <p className="text-orange-500 font-medium"><span className="font-medium text-slate-700">칼로리:</span> {calories}kcal</p>}
                        {memo && <p className="text-slate-600 text-sm">{memo}</p>}
                      </div>
                      
                      {/* 하단: 관리 버튼 */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button onClick={() => handleEdit(item)} className="flex-1 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition text-sm font-medium">수정</button>
                        <button onClick={() => handleDelete(item)} className="flex-1 py-2 text-red-400 hover:bg-red-50 rounded-lg transition text-sm font-medium">삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {visibleCount < history.length ? (
                <div className="text-center pt-4">
                  <button onClick={() => setVisibleCount(prev => prev + 5)} 
                    className="text-sm text-orange-600 hover:text-orange-800 font-bold py-2 px-6 hover:bg-orange-50 rounded-xl transition"
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
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Dumbbell size={24} /> 운동 기록
              </h2>
              <p className="text-sm opacity-90 mt-1">오늘 운동을 하셨나요?</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                  <Clock size={14} /> 날짜
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">운동 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['running', 'walking', 'swimming', 'cycling', 'weight', 'yoga', 'other'] as ExerciseType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`p-3 rounded-xl text-sm font-bold transition ${
                        formData.exerciseType === type
                          ? exerciseColors[type]
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {exerciseLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">시간 (분)</label>
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-mono text-lg"
                    value={formData.duration}
                    onChange={handleDurationChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                    <Flame size={14} /> 칼로리(kcal)
                  </label>
                  <input
                    type="number"
                    placeholder="300"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-mono text-lg"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">메모 (선택)</label>
                <textarea
                  placeholder="인터벌 러닝 30분"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Camera size={14} /> 사진 업로드</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition border-dashed">
                    <ImagePlus size={20} className="text-slate-500" />
                    <span className="text-sm text-slate-600 font-medium">사진 선택</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                  {formData.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-xl border-2 border-orange-500 shadow-sm" />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md group-hover:scale-110 transition"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.duration}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {saved ? '저장됨!' : loading ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        )}

        {editModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">운동 기록 수정</h3>
                <button onClick={() => setEditModal({open: false, item: null})} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">날짜</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">운동 유형</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['running', 'walking', 'swimming', 'cycling', 'weight', 'yoga', 'other'] as ExerciseType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditForm({...editForm, exerciseType: type})}
                        className={`p-2 rounded-xl text-sm font-bold transition ${
                          editForm.exerciseType === type
                            ? exerciseColors[type]
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {exerciseLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">시간 (분)</label>
                    <input
                      type="number"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({...editForm, duration: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">칼로리</label>
                    <input
                      type="number"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      value={editForm.calories}
                      onChange={(e) => setEditForm({...editForm, calories: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">메모</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
                    value={editForm.content}
                    onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition"
                >
                  수정하기
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 라이트박스 */}
        {lightboxImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-w-2xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <Image src={lightboxImage} alt="preview" width={800} height={600} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
              <div className="absolute top-4 right-4 flex gap-2">
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