import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import * as ScrollArea from '@radix-ui/react-scroll-area';

export const MessageList: React.FC = () => {
  const { messages, isTyping } = useChatStore();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll hacia el final cada vez que cambian los mensajes o el estado de isTyping
  useEffect(() => {
    const el = viewportRef.current!;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isTyping]);

  return (
    <ScrollArea.Root className="relative w-full flex-1 overflow-hidden bg-[var(--agichat-surface)]">
      <ScrollArea.Viewport ref={viewportRef} className="w-full h-full px-6 py-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </ScrollArea.Viewport>

      <ScrollArea.Scrollbar
        className="flex select-none touch-none p-0.5 bg-transparent hover:bg-gray-100 transition-colors duration-[160ms] ease-out data-[orientation=vertical]:w-2"
        orientation="vertical"
      >
        <ScrollArea.Thumb className="flex-1 bg-gray-300 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
