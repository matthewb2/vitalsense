// @/store/chatStore.ts
import { create } from 'zustand';

export interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ChatState {
  messages: Message[];
  // useState의 setMessages처럼 함수형 업데이트(prev => ...)와 일반 배열 입력을 모두 지원
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  clearMessages: () => void;
}

const initialMessages: Message[] = [
  { role: 'ai', content: '안녕하세요! 저는 바이탈센스 에이전트입니다. 건강에 관한 무엇이든 물어보세요. 혈당, 혈압, 식단, 운동 등 다양한 건강 정보를 알려드릴 수 있습니다.' }
];

export const useChatStore = create<ChatState>((set) => ({
  messages: initialMessages,
  setMessages: (updater) =>
    set((state) => ({
      messages: typeof updater === 'function' ? updater(state.messages) : updater,
    })),
  clearMessages: () => set({ messages: initialMessages }),
}));