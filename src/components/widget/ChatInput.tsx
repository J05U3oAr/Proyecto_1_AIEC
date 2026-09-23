import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { useChatStore } from '@/store/useChatStore';

export const ChatInput: React.FC = () => {
  const [text, setText] = useState('');
  const { sendMessage, receiveMessage, markMessageAsSent, markMessageAsError, setTyping } =
    useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-ajuste de altura del textarea
  useEffect(() => {
    const el = textareaRef.current!;

    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSend = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const messageId = sendMessage(trimmed);
    setText('');
    setTyping(true);

    try {
      const response = await chatService.sendMessage(trimmed);
      markMessageAsSent(messageId);
      receiveMessage(response.response);
    } catch {
      markMessageAsError(messageId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Evitar el salto de línea
      void handleSend();
    }
  };

  return (
    <div className="p-4 bg-white w-full">
      <div className="flex items-end gap-3 max-w-full">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none overflow-y-auto rounded-md border border-black px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black text-black bg-white placeholder-gray-500 min-h-[44px]"
          rows={1}
          aria-label="Campo de texto para mensaje"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim()}
          className="flex-shrink-0 w-11 h-11 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          aria-label="Enviar mensaje"
        >
          <ArrowRight size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
