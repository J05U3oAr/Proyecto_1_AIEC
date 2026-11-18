import responseSchema from '../../shared/contracts/v1/chat-response.schema.json';
import requestSchema from '../../shared/contracts/v1/chat-request.schema.json';
import { isRecord, matchesSchema } from '@/services/schemaValidation';
import type {
  Book,
  ChatRequest,
  ChatResponse,
  Movie,
  Source,
} from '@/services/contracts.generated';

export type ReferenceProvider = Source['provider'];
type UrlKind = ReferenceProvider | 'poster';

/** Accept only canonical provider URLs; parsing must not normalize unsafe input into an allowlisted URL. */
export function isProviderUrl(value: string, kind: UrlKind): boolean {
  if (value.length > 2048 || /[\s\\]/u.test(value)) return false;
  const routes: Record<UrlKind, RegExp> = {
    tmdb: /^https:\/\/www\.themoviedb\.org(?::443)?\/movie\/[1-9][0-9]*$/,
    imdb: /^https:\/\/www\.imdb\.com(?::443)?\/title\/tt[0-9]{7,10}\/?$/,
    google_books: /^https:\/\/books\.google\.com(?::443)?\/books\?id=[A-Za-z0-9_-]{1,128}$/,
    poster:
      /^https:\/\/image\.tmdb\.org(?::443)?\/t\/p\/(w(?:92|154|185|342|500|780)|original)\/[A-Za-z0-9]+\.(jpg|png)$/,
  };
  return routes[kind].test(value);
}

const validSource = (source: Source): boolean => isProviderUrl(source.url, source.provider);
const validBook = (book: Book): boolean =>
  isProviderUrl(book.url, 'google_books') && new URL(book.url).searchParams.get('id') === book.id;
const validMovie = (movie: Movie): boolean =>
  isProviderUrl(movie.tmdb, 'tmdb') &&
  new URL(movie.tmdb).pathname === `/movie/${movie.id}` &&
  (movie.poster == null || isProviderUrl(movie.poster, 'poster')) &&
  (movie.imdb == null || isProviderUrl(movie.imdb, 'imdb')) &&
  (movie.tmdbRating == null || (movie.voteCount != null && movie.voteCount > 0));

export const isChatRequest = (value: unknown): value is ChatRequest =>
  matchesSchema(value, requestSchema);

export function isChatResponse(value: unknown): value is ChatResponse {
  if (!matchesSchema(value, responseSchema)) return false;
  // Shape is proven against M1's schemas, before applying cross-field policies.
  const response = value as ChatResponse;
  if (!(response.movies ?? []).every(validMovie) || !(response.sources ?? []).every(validSource))
    return false;
  const adaptation = response.comparison?.adaptation;
  if (adaptation) {
    if (adaptation.book && !validBook(adaptation.book)) return false;
    if (!(adaptation.evidence ?? []).every(item => validSource(item.source))) return false;
    if (adaptation.status === 'confirmed' && (!adaptation.book || !adaptation.evidence?.length))
      return false;
  }
  return (response.actions ?? []).every(action => {
    if (!isProviderUrl(action.url, action.provider) || action.requestId !== response.requestId)
      return false;
    const url = new URL(action.url);
    return (
      action.resourceId ===
      (action.provider === 'imdb'
        ? url.pathname.split('/').filter(Boolean).slice(-1)[0]
        : url.searchParams.get('id'))
    );
  });
}

export type ResponseDetails = Pick<ChatResponse, 'movies' | 'comparison' | 'sources'>;

/** Explicit projection: no action, session, request ID or unknown property can enter history. */
export function responseDetails(response: ChatResponse): ResponseDetails {
  return {
    ...(response.movies ? { movies: response.movies } : {}),
    ...(response.comparison ? { comparison: response.comparison } : {}),
    ...(response.sources ? { sources: response.sources } : {}),
  };
}

export function isResponseDetails(value: unknown): value is ResponseDetails {
  return (
    isRecord(value) &&
    Object.keys(value).every(key => ['movies', 'comparison', 'sources'].includes(key)) &&
    isChatResponse({ response: 'history', ...value })
  );
}
