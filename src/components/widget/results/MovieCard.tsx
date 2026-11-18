import { useState } from 'react';
import type { Movie } from '@/services/contracts.generated';
import { isProviderUrl } from '@/services/responseValidation';
import { SourceLink } from '@/components/widget/results/ResultSources';

export function MovieCard({ movie }: { movie: Movie }) {
  const [failedPoster, setFailedPoster] = useState<string | null>(null);
  const poster =
    movie.poster && isProviderUrl(movie.poster, 'poster') && failedPoster !== movie.poster
      ? movie.poster
      : null;
  return (
    <article
      aria-label={`Película: ${movie.title}`}
      className="min-w-0 rounded-xl border border-[var(--agichat-border)] bg-[var(--agichat-surface-muted)] p-3"
    >
      <div className="flex items-start gap-3">
        <div className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--agichat-border)] bg-[var(--agichat-surface)]">
          {poster ? (
            <img
              src={poster}
              alt={`Póster de ${movie.title}`}
              width="160"
              height="240"
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={() => setFailedPoster(poster)}
            />
          ) : (
            <p className="flex h-full items-center justify-center p-2 text-center text-sm">
              Póster no disponible
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--agichat-text-muted)]">Película</p>
          <h3 className="text-lg font-semibold leading-snug">{movie.title}</h3>
          <p>
            {movie.year ?? 'Año no disponible'}
            {movie.runtime != null && ` · ${movie.runtime} min`}
          </p>
          {!!movie.genres?.length && <p className="mt-1 text-sm">{movie.genres.join(' · ')}</p>}
        </div>
      </div>
      {movie.tmdbRating != null && movie.voteCount != null && movie.voteCount > 0 && (
        <p className="mt-3 text-sm">
          Catálogo TMDB: {movie.tmdbRating.toFixed(1)}/10 · {movie.voteCount} votos
        </p>
      )}
      {movie.overview && (
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer content-center rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2">
            Sinopsis (puede contener spoilers)
          </summary>
          <p className="whitespace-pre-wrap">{movie.overview}</p>
        </details>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 text-sm">
        <SourceLink source={{ provider: 'tmdb', url: movie.tmdb, label: movie.title }}>
          Fuente: TMDB
        </SourceLink>
        {movie.imdb && (
          <SourceLink source={{ provider: 'imdb', url: movie.imdb, label: movie.title }}>
            Ficha en IMDb
          </SourceLink>
        )}
      </div>
    </article>
  );
}
