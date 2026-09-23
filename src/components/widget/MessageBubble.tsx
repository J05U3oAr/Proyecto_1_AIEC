import React from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Message } from '@/store/types';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasError = message.status === 'error';

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div
          className={`max-w-[85%] rounded-full border px-6 py-2 text-sm shadow-sm ${
            hasError
              ? 'border-red-500 bg-red-50 text-red-800'
              : 'border-[var(--agichat-border)] bg-[var(--agichat-surface-muted)] text-[var(--agichat-text)]'
          }`}
        >
          {message.content}
          {hasError && (
            <span className="ml-2 text-xs font-semibold" role="status">
              No se pudo enviar
            </span>
          )}
        </div>
      </div>
    );
  }

  // Assistant message: Plain text left-aligned, no bubble background according to wireframe
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[90%] text-[var(--agichat-text)]">
        <MarkdownRenderer content={message.content} />
      </div>
    </div>
  );
};
