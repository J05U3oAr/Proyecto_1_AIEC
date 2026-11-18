import type { ReactNode } from 'react';
import type { Source } from '@/services/contracts.generated';
import { isProviderUrl } from '@/services/responseValidation';
import googleLogo from '@/assets/attribution/google-books-poweredby.png';

const names = { tmdb: 'TMDB', imdb: 'IMDb', google_books: 'Google Books' };

export function SourceLink({ source, children }: { source: Source; children?: ReactNode }) {
  if (!isProviderUrl(source.url, source.provider)) return <span>Referencia no disponible</span>;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded px-1 underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agichat-text)]"
    >
      {children ?? `${source.label} · ${names[source.provider]}`}
      <span className="sr-only"> (abre otra pestaña)</span>
    </a>
  );
}

/** The original graphic is adjacent to its results, never recolored for a theme. */
export function BooksAttribution() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span>Información de Google Books</span>
      <span className="rounded bg-white p-2">
        <img src={googleLogo} alt="Powered by Google" width="88" height="31" />
      </span>
    </div>
  );
}

export function ResultSources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  const books = sources.filter(source => source.provider === 'google_books');
  const others = sources.filter(source => source.provider !== 'google_books');
  return (
    <section
      aria-label="Fuentes de la respuesta"
      className="space-y-3 border-t border-[var(--agichat-border)] pt-3 text-sm"
    >
      <h3 className="font-semibold">Fuentes</h3>
      {others.length > 0 && (
        <ul>
          {others.map((source, i) => (
            <li key={i}>
              <SourceLink source={source} />
            </li>
          ))}
        </ul>
      )}
      {books.length > 0 && (
        <div>
          <BooksAttribution />
          <ul>
            {books.map((source, i) => (
              <li key={i}>
                <SourceLink source={source} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
