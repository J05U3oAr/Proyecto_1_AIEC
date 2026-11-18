import { useContext } from 'react';
import { ChatServiceContext } from '@/services/ChatServiceContext';
import { resetConversation, submitChatMessage } from '@/services/conversation';
import { useChatStore } from '@/store/useChatStore';

export function useChat() {
  const service = useContext(ChatServiceContext);
  const isTyping = useChatStore(state => state.isTyping);
  const lastError = useChatStore(state => state.lastError);
  return {
    isTyping,
    lastError,
    send: (prompt: string) => submitChatMessage(prompt, service),
    reset: () => resetConversation(service),
  };
}
