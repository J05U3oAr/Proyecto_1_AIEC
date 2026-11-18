import valid from '../../docs/integration/fixtures/m3-comparison-valid.json';
import uncertain from '../../docs/integration/fixtures/m3-comparison-uncertain.json';
import partial from '../../docs/integration/fixtures/m3-comparison-partial.json';
import notFound from '../../docs/integration/fixtures/m3-comparison-not-found.json';
import { isChatResponse } from '@/services/responseValidation';
import type { ChatResponse } from '@/services/types';

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
