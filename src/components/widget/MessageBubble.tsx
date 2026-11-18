import React from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Message } from '@/store/types';
import { MessageResults } from '@/components/widget/results/MessageResults';
import { BooksAttribution } from '@/components/widget/results/ResultSources';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasError = message.status === 'error';
  const hasBooks =
    message.details?.comparison?.adaptation.book ||
    message.details?.sources?.some(source => source.provider === 'google_books') ||
    message.details?.comparison?.adaptation.evidence?.some(
      item => item.source.provider === 'google_books'
    );

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
      <div className="min-w-0 w-full break-words [overflow-wrap:anywhere] text-base leading-relaxed text-[var(--agichat-text)]">
        {!!(message.details?.movies?.length || message.details?.comparison) && (
          <p className="mb-2 text-sm font-semibold">Recomendación y valoración de Sofía · IA</p>
        )}
        {hasBooks && <BooksAttribution />}
        <MarkdownRenderer content={message.content} />
        {message.details && (
          <MessageResults details={message.details} responseText={message.content} />
        )}
      </div>
    </div>
  );
};
