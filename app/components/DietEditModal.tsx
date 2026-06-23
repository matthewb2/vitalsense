"use client";

import React from 'react';
import Image from 'next/image'
import { X, ImagePlus, Camera } from 'lucide-react';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'other';

interface FoodRecord {
  _id: number;
  date: string;
  mealType: MealType;
  content: string;
  calories?: string;
  image?: string | null;
}

interface EditModalProps {
  open: boolean;
  item: FoodRecord | null;
  form: {
    date: string;
    mealType: MealType;
    content: string;
    calories: string;
    images: string[];
  };
  onFormChange: (field: string, value: any) => void;
  onClose: () => void;
  onSave: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

const IMAGE_HOST_URL = 'http://mksolution.dothome.co.kr/images';

const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${IMAGE_HOST_URL}/${imagePath}`;
};

export default function DietEditModal({ open, item, form, onFormChange, onClose, onSave, onImageChange }: EditModalProps) {
  if (!open || !item) return null;

  const removeImage = (idx: number) => {
    const next = form.images.filter((_, i) => i !== idx);
    onFormChange('images', next);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold">식단 기록 수정</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">날짜</label>
            <input 
              type="date" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" 
              value={form.date} 
              onChange={(e) => onFormChange('date', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">식사 유형</label>
            <div className="grid grid-cols-4 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'other'] as MealType[]).map((type) => (
                <button 
                  key={type} 
                  type="button" 
                  onClick={() => onFormChange('mealType', type)} 
                  className={`p-2 rounded-xl text-sm font-bold transition ${form.mealType === type ? mealColors[type] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {mealLabels[type]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">메뉴</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-20 outline-none focus:ring-2 focus:ring-green-500" 
              value={form.content} 
              onChange={(e) => onFormChange('content', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">칼로리 (kcal)</label>
            <input 
              type="number" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" 
              value={form.calories} 
              onChange={(e) => onFormChange('calories', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Camera size={14} /> 사진</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition border-dashed">
                <ImagePlus size={20} className="text-slate-500" /><span className="text-sm text-slate-600">사진 추가</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onImageChange} />
              </label>

              {form.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={getImageUrl(img) || ''}
                    alt="food"
                    className="w-20 h-20 object-cover rounded-xl border-2 border-green-500 shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {form.images.length === 0 && (
                <p className="text-sm text-slate-400 self-center">등록된 사진이 없습니다</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onSave} className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition shadow-md">수정 사항 저장</button>
        </div>
      </div>
    </div>
  );
}
