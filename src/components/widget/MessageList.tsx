import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import * as ScrollArea from '@radix-ui/react-scroll-area';

export const MessageList: React.FC = () => {
  const { messages, isTyping } = useChatStore();
  const viewportRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [hasNew, setHasNew] = useState(false);

  const scrollToEnd = () => {
    const el = viewportRef.current!;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    nearBottom.current = true;
    setHasNew(false);
  };

  // Auto-scroll hacia el final cada vez que cambian los mensajes o el estado de isTyping
  useEffect(() => {
    if (
      nearBottom.current ||
      messages.length === 0 ||
      messages[messages.length - 1]?.role === 'user'
    ) {
      const el = viewportRef.current!;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
      nearBottom.current = true;
      setHasNew(false);
    } else if (!isTyping) setHasNew(true);
  }, [messages, isTyping]);

  return (
    <ScrollArea.Root className="relative min-h-0 w-full flex-1 overflow-hidden bg-[var(--agichat-surface)]">
      <ScrollArea.Viewport
        role="log"
        aria-label="Conversación con Sofía"
        tabIndex={0}
        ref={viewportRef}
        className="w-full h-full px-4 py-4"
        onScroll={event => {
          const el = event.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
          if (nearBottom.current) setHasNew(false);
        }}
      >
        {messages.length === 0 && (
          <p className="text-base leading-relaxed text-[var(--agichat-text)]">
            ¿Qué te gustaría ver? Puedes indicar género, duración o una película que te guste.
            También puedes corregir un título o año durante la conversación.
          </p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </ScrollArea.Viewport>
      {hasNew && (
        <button
          type="button"
          onClick={scrollToEnd}
          className="absolute bottom-2 left-4 right-4 min-h-11 rounded-lg border border-[var(--agichat-border)] bg-[var(--agichat-surface)] px-3 text-[var(--agichat-text)] underline focus-visible:outline focus-visible:outline-2"
        >
          Nueva respuesta · ir al final
        </button>
      )}

      <ScrollArea.Scrollbar
        className="flex select-none touch-none p-0.5 bg-transparent hover:bg-gray-100 transition-colors duration-[160ms] ease-out data-[orientation=vertical]:w-2"
        orientation="vertical"
      >
        <ScrollArea.Thumb className="flex-1 bg-gray-300 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
