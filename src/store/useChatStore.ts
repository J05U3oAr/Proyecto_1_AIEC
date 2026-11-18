import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatState, Message } from '@/store/types';
import { HISTORY_VERSION, restoreHistory } from '@/store/historyPersistence';

const createMessage = (
  role: Message['role'],
  content: string,
  status: Message['status']
): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
  status,
});

export const useChatStore = create<ChatState>()(
  persist(
    set => ({
      session: null,
      conversationVersion: 0,
      setSession: session => set({ session }),
      isOpen: false,
      isExpanded: false,
      messages: [],
      isTyping: false,
      lastError: null,
      setError: lastError => set({ lastError }),
      toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
      toggleExpand: () => set(state => ({ isExpanded: !state.isExpanded })),
      sendMessage: content => {
        const message = createMessage('user', content, 'sending');
        set(state => ({ messages: [...state.messages, message] }));
        return message.id;
      },
      receiveMessage: (content, details) =>
        set(state => ({
          messages: [
            ...state.messages,
            { ...createMessage('assistant', content, 'sent'), ...(details ? { details } : {}) },
          ],
          isTyping: false,
        })),
      markMessageAsSent: messageId =>
        set(state => ({
          messages: state.messages.map(message =>
            message.id === messageId ? { ...message, status: 'sent' } : message
          ),
        })),
      markMessageAsError: messageId =>
        set(state =>
          state.messages.some(message => message.id === messageId)
            ? {
                messages: state.messages.map(message =>
                  message.id === messageId ? { ...message, status: 'error' } : message
                ),
                isTyping: false,
              }
            : state
        ),
      setTyping: isTyping => set({ isTyping }),
      clearChat: () =>
        set(state => ({
          messages: [],
          isTyping: false,
          session: null,
          lastError: null,
          conversationVersion: state.conversationVersion + 1,
        })),
    }),
    {
      name: 'agichat-conversation',
      version: HISTORY_VERSION,
      partialize: state => restoreHistory({ messages: state.messages }),
      migrate: (snapshot, version) => (version === 0 ? restoreHistory(snapshot) : { messages: [] }),
      merge: (snapshot, current) => ({ ...current, ...restoreHistory(snapshot) }),
    }
  )
);
