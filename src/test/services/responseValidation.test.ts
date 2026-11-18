import { describe, expect, it } from 'vitest';
import responseSchema from '../../../shared/contracts/v1/chat-response.schema.json';
import requestSchema from '../../../shared/contracts/v1/chat-request.schema.json';
import fixture from '../../../docs/integration/fixtures/m3-comparison-valid.json';
import uncertain from '../../../docs/integration/fixtures/m3-comparison-uncertain.json';
import partial from '../../../docs/integration/fixtures/m3-comparison-partial.json';
import notFound from '../../../docs/integration/fixtures/m3-comparison-not-found.json';
import {
  isChatRequest,
  isChatResponse,
  isProviderUrl,
  isResponseDetails,
  responseDetails,
} from '@/services/responseValidation';
import { matchesSchema, type Schema } from '@/services/schemaValidation';

describe('published HTTP contract consumer', () => {
  it.each([fixture, uncertain, partial, notFound])(
    'accepts the M3 fixture $case without provider calls',
    item => {
      expect(isChatResponse(item.response)).toBe(true);
    }
  );

  it('accepts legacy and nullable optional fields without inserting invented defaults', () => {
    expect(isChatResponse({ response: 'Hello' })).toBe(true);
    expect(
      isChatResponse({ response: 'Hello', sessionId: null, requestId: null, comparison: null })
    ).toBe(true);
    expect(isChatRequest({ prompt: 'Hola', navigationIntent: { provider: 'imdb' } })).toBe(true);
    expect(isChatRequest({ prompt: 'Hola', navigationIntent: { provider: 'shell' } })).toBe(false);
  });

  it.each([
    null,
    [],
    {},
    { response: '' },
    { response: 'x'.repeat(16001) },
    { response: 'ok', extra: 'secret' },
    { response: 'ok', sessionId: 'bad id' },
    { response: 'ok', movies: [{ id: 0, title: 'x', tmdb: 'https://www.themoviedb.org/movie/1' }] },
    { response: 'ok', movies: Array.from({ length: 11 }, () => fixture.response.movies[0]) },
    {
      response: 'ok',
      comparison: { adaptation: { movieId: 1, status: 'confirmed' }, verdict: 'x' },
    },
    { response: 'ok', sources: [{ provider: 'tmdb', label: 'x', url: 'https://evil.example' }] },
    {
      response: 'ok',
      actions: [
        {
          id: 'a',
          requestId: 'r',
          resourceId: 'x',
          provider: 'google_books',
          url: 'https://books.google.com/books?id=x',
        },
      ],
    },
  ])('rejects invalid or oversized shapes %#', value => {
    expect(isChatResponse(value)).toBe(false);
  });

  it('enforces catalog IDs, ratings, book links and evidence beyond JSON shape', () => {
    const base = fixture.response;
    const movie = base.movies[0];
    for (const change of [
      { id: 99 },
      { poster: 'https://evil.example/poster.jpg' },
      { imdb: 'javascript:alert(1)' },
      { tmdbRating: 8, voteCount: 0 },
      { tmdbRating: 8 },
    ])
      expect(isChatResponse({ response: 'x', movies: [{ ...movie, ...change }] })).toBe(false);
    expect(
      isChatResponse({ response: 'x', movies: [{ ...movie, tmdbRating: 0, voteCount: 1 }] })
    ).toBe(true);
    const comparison = structuredClone(base.comparison);
    comparison.adaptation.book.id = 'different';
    expect(isChatResponse({ response: 'x', comparison })).toBe(false);
    comparison.adaptation.book = base.comparison.adaptation.book;
    comparison.adaptation.evidence[0].source.url = 'https://evil.example';
    expect(isChatResponse({ response: 'x', comparison })).toBe(false);
  });

  it('checks action ID correspondence but never executes actions or stores them in details', () => {
    const action = {
      type: 'open_reference',
      id: 'a',
      requestId: 'r',
      provider: 'imdb',
      resourceId: 'tt0083658',
      url: 'https://www.imdb.com/title/tt0083658/',
    };
    const response = { ...fixture.response, requestId: 'r', actions: [action] };
    expect(isChatResponse(response)).toBe(true);
    expect(isChatResponse({ ...response, actions: [{ ...action, resourceId: 'tt0000000' }] })).toBe(
      false
    );
    expect(isChatResponse({ ...response, actions: [{ ...action, requestId: 'other' }] })).toBe(
      false
    );
    expect(
      isChatResponse({ ...response, actions: [{ ...action, url: 'https://evil.example' }] })
    ).toBe(false);
    const bookAction = {
      ...action,
      provider: 'google_books',
      resourceId: 'book',
      url: 'https://books.google.com/books?id=book',
    };
    expect(isChatResponse({ ...response, actions: [bookAction] })).toBe(true);
    expect(isChatResponse({ ...response, actions: [{ ...bookAction, resourceId: 'other' }] })).toBe(
      false
    );
    if (!isChatResponse(response)) throw new Error('Fixture invalid');
    expect(responseDetails(response)).not.toHaveProperty('actions');
    expect(isResponseDetails(responseDetails(response))).toBe(true);
    expect(isResponseDetails({ actions: [action] })).toBe(false);
    expect(isResponseDetails(null)).toBe(false);
  });

  it.each([
    'http://books.google.com/books?id=x',
    'https://books.google.com.evil.test/books?id=x',
    'https://user@books.google.com/books?id=x',
    'https://books.google.com:444/books?id=x',
    'https://books.google.com/books?id=x&id=y',
    'https://books.google.com/books?id=x#fragment',
    'https://books.google.com/books?id=x&x=y',
    'https://books.google.com/a/../books?id=x',
    'https://books.google.com/books?id=%78',
    'https://books.google.com/books?id=x\n',
    'https://books.google.com\\@evil.test/books?id=x',
    'x'.repeat(2049),
  ])('rejects noncanonical book URL %s', url =>
    expect(isProviderUrl(url, 'google_books')).toBe(false)
  );

  it('allows only official poster sizes and image extensions', () => {
    expect(isProviderUrl('https://image.tmdb.org/t/p/w500/abc.jpg', 'poster')).toBe(true);
    expect(isProviderUrl('https://image.tmdb.org/t/p/original/abc.png', 'poster')).toBe(true);
    expect(isProviderUrl('https://image.tmdb.org/t/p/w500/abc.svg', 'poster')).toBe(false);
    expect(isProviderUrl('https://image.tmdb.org/t/p/w999/abc.jpg', 'poster')).toBe(false);
    expect(isProviderUrl('https://www.imdb.com:443/title/tt0083658', 'imdb')).toBe(true);
  });
});

describe('bounded schema subset', () => {
  it.each<[unknown, Schema, boolean]>([
    [{ a: 1 }, { type: 'object', additionalProperties: false }, false],
    [{ a: 1 }, { type: 'object' }, true],
    [[], { type: 'object' }, false],
    [null, { type: 'object' }, false],
    [{}, { type: 'object', required: ['a'] }, false],
    [{ a: 'x' }, { type: 'object', properties: { a: { type: 'number' } } }, false],
    [false, { type: 'boolean' }, true],
    ['true', { type: 'boolean' }, false],
    [null, { type: 'null' }, true],
    ['x', { type: 'null' }, false],
    ['a', { const: 'a' }, true],
    ['b', { const: 'a' }, false],
    ['a', { enum: ['a'] }, true],
    ['b', { enum: ['a'] }, false],
    ['abc', { type: 'string', minLength: 4 }, false],
    ['abc', { type: 'string', maxLength: 2 }, false],
    ['😀', { type: 'string', minLength: 1, maxLength: 1 }, true],
    [1, { type: 'string' }, false],
    ['bad!', { type: 'string', pattern: '^[a-z]+$' }, false],
    [1.5, { type: 'integer' }, false],
    [NaN, { type: 'number' }, false],
    [Infinity, { type: 'number' }, false],
    ['1', { type: 'number' }, false],
    [1, { type: 'number', minimum: 2 }, false],
    [3, { type: 'number', maximum: 2 }, false],
    [0, { type: 'number', exclusiveMinimum: 0 }, false],
    [2.5, { type: 'number', minimum: 2 }, true],
    [[1], { type: 'array' }, false],
    [[1], { type: 'array', items: { type: 'number' } }, true],
    [null, { type: 'array', items: { type: 'number' } }, false],
    [[1, 2], { type: 'array', items: { type: 'number' }, maxItems: 1 }, false],
    [[false], { type: 'array', items: { type: 'number' } }, false],
    ['a', { anyOf: [{ type: 'number' }, { type: 'string' }] }, true],
    [false, { anyOf: [{ type: 'number' }, { type: 'string' }] }, false],
    [1, { $ref: '#/$defs/missing' }, false],
    [1, { type: 'unsupported' }, false],
    [1, { $ref: '#/$defs/self', $defs: { self: { $ref: '#/$defs/self' } } }, false],
  ])('enforces supported keyword case %#', (value, schema, valid) => {
    expect(matchesSchema(value, schema)).toBe(valid);
  });

  it('fails closed if schemas introduce unsupported validation keywords', () => {
    const changedSchema = { type: 'number', multipleOf: 2 };
    expect(matchesSchema(2, changedSchema)).toBe(false);
    // Exercise every schema node so a newly unsupported keyword cannot hide in an optional field.
    const check = (schema: Schema) => {
      const keys = Object.keys(schema).filter(
        key => !['$defs', 'properties', 'items', 'anyOf'].includes(key)
      );
      expect(
        matchesSchema(
          undefined,
          Object.fromEntries(
            keys
              .filter(key => !['type', '$ref', 'const', 'enum'].includes(key))
              .map(key => [key, schema[key as keyof Schema]])
          )
        )
      ).toBe(true);
      Object.values(schema.$defs ?? {}).forEach(check);
      Object.values(schema.properties ?? {}).forEach(check);
      schema.anyOf?.forEach(check);
      if (schema.items) check(schema.items);
    };
    check(requestSchema);
    check(responseSchema);
  });
});
