import valid from '../../docs/integration/fixtures/m3-comparison-valid.json';
import uncertain from '../../docs/integration/fixtures/m3-comparison-uncertain.json';
import partial from '../../docs/integration/fixtures/m3-comparison-partial.json';
import notFound from '../../docs/integration/fixtures/m3-comparison-not-found.json';
import { isChatResponse } from '@/services/responseValidation';
import type { ChatResponse } from '@/services/types';
import type { NavigationIntent } from '@/services/contracts.generated';

export type CinemaScenario = 'movie' | 'comparison' | 'uncertain' | 'partial' | 'not_found';

/** Local, labelled fixtures. No poster URL: the preview makes zero image/provider requests. */
export function cinemaFixture(scenario: CinemaScenario, requestId?: string | null): ChatResponse {
  const fixtures = { movie: valid, comparison: valid, uncertain, partial, not_found: notFound };
  const response: unknown =
    scenario === 'movie'
      ? {
          response:
            'Ejemplo simulado: para explorar ciencia ficción y una adaptación literaria, esta ficha muestra Blade Runner. Esta recomendación no procede de una consulta real.',
          movies: valid.response.movies,
          sources: [valid.response.sources[0]],
          ...(requestId !== undefined ? { requestId } : {}),
        }
      : { ...fixtures[scenario].response, ...(requestId !== undefined ? { requestId } : {}) };
  if (!isChatResponse(response)) throw new Error('Invalid local cinema fixture');
  return response;
}

/** Simulated authorization using public reference IDs already recorded in M3's evidence. */
export function navigationFixture(intent: NavigationIntent, requestId: string): ChatResponse {
  const response = structuredClone(cinemaFixture('comparison', requestId));
  const book = response.comparison!.adaptation.book!;
  book.id = '3vExWrUnJB0C';
  book.url = 'https://books.google.com/books?id=3vExWrUnJB0C';
  response.sources = response.sources?.map(source =>
    source.url.endsWith('id=fixture_m33') ? { ...source, url: book.url } : source
  );
  const url = intent.provider === 'imdb' ? response.movies![0].imdb! : book.url;
  response.response =
    'Referencia de demostración solicitada. La acción es simulada; el destino es el sitio público del proveedor.';
  response.actions = [
    {
      type: 'open_reference',
      id: requestId,
      requestId,
      provider: intent.provider,
      resourceId: intent.provider === 'imdb' ? 'tt0083658' : book.id,
      url,
    },
  ];
  return response;
}
