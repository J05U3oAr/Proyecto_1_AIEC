import { create } from 'zustand';
import { ChatState } from './types';

export const useChatStore = create<ChatState>(set => ({
  isOpen: false,
  isExpanded: false,
  messages: [],
  isTyping: false,
  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
  toggleExpand: () => set(state => ({ isExpanded: !state.isExpanded })),
  addMessage: msg =>
    set(state => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),
  setTyping: isTyping => set({ isTyping }),
  clearChat: () => set({ messages: [], isTyping: false }),
}));
