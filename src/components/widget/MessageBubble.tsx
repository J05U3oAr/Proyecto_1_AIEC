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
      <div className="mb-6 flex justify-start">
        <div
          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border px-4 py-2 text-sm ${
            hasError
              ? 'border-red-500 bg-red-50 text-red-800'
              : 'border-[var(--agichat-border)] bg-[var(--agichat-surface)] text-[var(--agichat-text)]'
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

  return (
    <div className="mb-6 flex justify-end">
      <div className="min-w-0 max-w-[92%] break-words rounded-2xl rounded-tr-sm border border-[var(--agichat-border)] bg-[var(--agichat-surface-muted)] px-3 py-2 text-left text-base leading-relaxed text-[var(--agichat-text)] [overflow-wrap:anywhere]">
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
