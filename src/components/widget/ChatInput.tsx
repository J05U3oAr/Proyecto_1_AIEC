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
    <div className="w-full bg-[var(--agichat-surface)] p-4">
      <div className="flex items-end gap-3 max-w-full">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] flex-1 resize-none overflow-y-auto rounded-md border border-[var(--agichat-border)] bg-[var(--agichat-surface)] px-4 py-2.5 text-sm text-[var(--agichat-text)] placeholder:text-[var(--agichat-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--agichat-primary)]"
          rows={1}
          aria-label="Campo de texto para mensaje"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--agichat-primary)] text-[var(--agichat-primary-contrast)] transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--agichat-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          <ArrowRight size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
