import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatState, Message } from '@/store/types';

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
      toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
      toggleExpand: () => set(state => ({ isExpanded: !state.isExpanded })),
      sendMessage: content => {
        const message = createMessage('user', content, 'sending');
        set(state => ({ messages: [...state.messages, message] }));
        return message.id;
      },
      receiveMessage: content =>
        set(state => ({
          messages: [...state.messages, createMessage('assistant', content, 'sent')],
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
          conversationVersion: state.conversationVersion + 1,
        })),
    }),
    {
      name: 'agichat-conversation',
      partialize: state => ({ messages: state.messages }),
    }
  )
);
