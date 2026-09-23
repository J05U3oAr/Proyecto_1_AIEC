import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

export const ChatInput: React.FC = () => {
  const [text, setText] = useState('');
  const { addMessage } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-ajuste de altura del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Agregar mensaje del usuario
    addMessage({
      role: 'user',
      content: trimmed,
    });
    setText('');
    
    // Obtener la función setTyping directamente del store
    const { setTyping } = useChatStore.getState();
    setTyping(true);

    // Simular respuesta del agente para probar la UI
    // Esto se reemplazará cuando conectemos el IChatService
    setTimeout(() => {
      setTyping(false);
      addMessage({
        role: 'assistant',
        content: 'Según La guía del autoestopista galáctico de Douglas Adams, la respuesta a la pregunta última sobre la vida, el universo y todo lo demás es 42.',
      });
    }, 2000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Evitar el salto de línea
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white w-full">
      <div className="flex items-end gap-3 max-w-full">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none overflow-y-auto rounded-md border border-black px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black text-black bg-white placeholder-gray-500 min-h-[44px]"
          rows={1}
          aria-label="Campo de texto para mensaje"
        />
        <button
          onClick={handleSend}
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
