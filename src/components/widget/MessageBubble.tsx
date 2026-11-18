import React from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Message } from '@/store/types';
import { MessageResults } from '@/components/widget/results/MessageResults';
import { BooksAttribution } from '@/components/widget/results/ResultSources';
import { isResponseDetails, type ResponseDetails } from '@/services/responseValidation';

interface Props {
  message: Message;
}

function catalogText(value: string): string {
  return value
    .replace(/https?:\/\/\S+/g, '[referencia omitida]')
    .replace(/([\\\x60*_{}[\]<>()#!|])/g, '\\$1');
}

function visibleReply(content: string, details: ResponseDetails | undefined): string {
  if (!details || !isResponseDetails(details) || details.movies?.length !== 1) return content;
  if (/^\s*(?:\x60{3,}|~{3,})/m.test(content)) return content;
  const [movie] = details.movies;
  const repeated = new Set<string>();
  if (movie.year != null) repeated.add('**' + catalogText(movie.title) + ' (' + movie.year + ')**');
  if (movie.genres?.length) repeated.add('Géneros: ' + movie.genres.map(catalogText).join(', '));
  if (movie.runtime != null) repeated.add('Duración: ' + movie.runtime + ' min');
  if (movie.tmdbRating != null && movie.voteCount) {
    repeated.add(
      'Puntuación TMDB: ' + movie.tmdbRating.toFixed(1) + '/10 (' + movie.voteCount + ' votos)'
    );
  }
  if (movie.overview) {
    const synopsis = catalogText(Array.from(movie.overview).slice(0, 1600).join(''));
    repeated.add('Sinopsis de TMDB: ' + synopsis);
  }
  return content
    .split(/\r?\n\r?\n/)
    .filter(paragraph => !repeated.has(paragraph.trim()))
    .join('\n\n');
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
      <div className="mb-6 flex justify-end">
        <div
          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm border px-4 py-2 text-left text-sm ${
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

  const reply = visibleReply(message.content, message.details);

  return (
    <div className="mb-6 flex justify-start">
      <div className="min-w-0 max-w-[92%] break-words rounded-2xl rounded-tl-sm border border-[var(--agichat-border)] bg-[var(--agichat-surface-muted)] px-3 py-2 text-left text-base leading-relaxed text-[var(--agichat-text)] [overflow-wrap:anywhere]">
        {!!(message.details?.movies?.length || message.details?.comparison) && (
          <p className="mb-2 text-sm font-semibold">Recomendación y valoración de Sofía · IA</p>
        )}
        {hasBooks && <BooksAttribution />}
        {reply.trim() && <MarkdownRenderer content={reply} />}
        {message.details && <MessageResults details={message.details} responseText={reply} />}
      </div>
    </div>
  );
};
