'use client';

import { Trash2, Plus } from 'lucide-react';

interface ChatHistoryItem {
  _id: string;
  content: string;
  createdAt?: string;
}

interface ChatHistorySidebarProps {
  open: boolean;
  items: ChatHistoryItem[];
  onClose: () => void;
  onItemClick: (item: ChatHistoryItem) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onNewChat?: () => void;
}

export default function ChatHistorySidebar({ open, items, onClose, onItemClick, onDelete, onNewChat }: ChatHistorySidebarProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">이전 질문</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => { onNewChat?.(); onClose(); }} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600" title="새 채팅">
              <Plus size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">이전 질문이 없습니다.</p>
          ) : (
            items.map((item, i) => (
              <div
                key={item._id || i}
                onClick={() => onItemClick(item)}
                className="p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition group"
              >
                <p className="text-sm text-slate-700 line-clamp-2">{item.content}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-slate-400">{item.createdAt?.split('T')[0] || ''}</p>
                  <button
                    onClick={(e) => onDelete(e, item._id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition"
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
  );
}
