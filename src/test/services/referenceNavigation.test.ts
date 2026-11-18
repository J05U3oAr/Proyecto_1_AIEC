import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ReferenceNavigator,
  RESERVATION_TIMEOUT_MS,
  validatedReference,
  type ReservedTab,
} from '@/services/referenceNavigation';
import type { ChatResponse, NavigationIntent } from '@/services/contracts.generated';

function tab(): ReservedTab {
  const value = {
    closed: false,
    opener: {} as unknown,
    location: { href: 'about:blank', replace: vi.fn() },
    close: vi.fn(() => {
      value.closed = true;
    }),
  };
  return value;
}

function reply(
  provider: NavigationIntent['provider'] = 'imdb',
  requestId = 'r',
  id = 'a'
): ChatResponse {
  const url =
    provider === 'imdb'
      ? 'https://www.imdb.com/title/tt0083658/'
      : 'https://books.google.com/books?id=book';
  return {
    response: 'Requested reference',
    requestId,
    movies: [
      {
        id: 78,
        title: 'Blade Runner',
        tmdb: 'https://www.themoviedb.org/movie/78',
        imdb: 'https://www.imdb.com/title/tt0083658/',
      },
    ],
    comparison: {
      adaptation: {
        movieId: 78,
        status: 'confirmed',
        book: { id: 'book', title: 'Book', url: 'https://books.google.com/books?id=book' },
        evidence: [
          {
            statement: 'Evidence',
            source: {
              provider: 'google_books',
              label: 'Book',
              url: 'https://books.google.com/books?id=book',
            },
          },
        ],
      },
      verdict: 'Opinion',
    },
    actions: [
      {
        type: 'open_reference',
        id,
        requestId,
        provider,
        resourceId: provider === 'imdb' ? 'tt0083658' : 'book',
        url,
      },
    ],
  };
}

describe('single-use tab reservations (window doubles, not browser evidence)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['imdb', 'google_books'] as const)(
    'reserves once synchronously and navigates valid %s with opener severed',
    provider => {
      const child = tab();
      const open = vi.fn(() => child);
      const notify = vi.fn();
      const ticket = new ReferenceNavigator(open).reserve('r', { provider }, notify);
      expect(open).toHaveBeenCalledTimes(1);
      expect(child.opener).toBeNull();
      expect(child.location.replace).not.toHaveBeenCalled();
      ticket.finish(reply(provider));
      ticket.finish(reply(provider));
      ticket.cancel();
      expect(child.location.replace).toHaveBeenCalledExactlyOnceWith(
        reply(provider).actions![0].url
      );
      expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'requested' }));
      expect(child.close).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    }
  );
  it('uses about:blank and _blank without noopener features that discard the navigable handle', () => {
    const child = tab();
    const open = vi.spyOn(window, 'open').mockReturnValue(child as Window);
    const ticket = new ReferenceNavigator().reserve('r', { provider: 'imdb' }, vi.fn());
    expect(open).toHaveBeenCalledExactlyOnceWith('about:blank', '_blank');
    ticket.cancel();
    expect(child.close).toHaveBeenCalledTimes(1);
  });
  it.each([
    'blocked',
    'throws',
    'closed',
    'changed',
    'replace-fails',
    'opener-fails',
    'opener-retained',
  ])('handles %s without another window.open', kind => {
    const child = tab();
    if (kind === 'opener-fails')
      Object.defineProperty(child, 'opener', {
        set() {
          throw new Error('denied');
        },
      });
    if (kind === 'opener-retained')
      Object.defineProperty(child, 'opener', {
        get() {
          return {};
        },
        set() {},
      });
    const open = vi.fn(() => {
      if (kind === 'throws') throw new Error('blocked');
      return kind === 'blocked' ? null : child;
    });
    const notify = vi.fn();
    const ticket = new ReferenceNavigator(open).reserve('r', { provider: 'imdb' }, notify);
    if (kind === 'closed') child.closed = true;
    if (kind === 'changed') child.location.href = 'https://user-chosen.example';
    if (kind === 'replace-fails')
      vi.mocked(child.location.replace).mockImplementation(() => {
        throw new Error('denied');
      });
    ticket.finish(reply());
    expect(open).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'blocked',
        fallback: expect.objectContaining({ url: reply().actions![0].url }),
      })
    );
    if (kind === 'changed') expect(child.close).not.toHaveBeenCalled();
  });
  it('expires and cancels idempotently, ignoring late results', async () => {
    const child = tab();
    const notify = vi.fn();
    const ticket = new ReferenceNavigator(() => child).reserve('r', { provider: 'imdb' }, notify);
    await vi.advanceTimersByTimeAsync(RESERVATION_TIMEOUT_MS + 1);
    ticket.finish(reply());
    ticket.cancel();
    expect(child.close).toHaveBeenCalledOnce();
    expect(child.location.replace).not.toHaveBeenCalled();
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'expired' }));
    const second = tab();
    const cancel = new ReferenceNavigator(() => second).reserve('r', { provider: 'imdb' }, notify);
    cancel.cancel();
    cancel.cancel();
    cancel.finish(reply());
    expect(second.close).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'cancelled' }));
  });
  it('does not reuse action IDs across requests or keep an unusable cross-origin handle', () => {
    const first = tab();
    const second = tab();
    const open = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const navigator = new ReferenceNavigator(open);
    const notify = vi.fn();
    navigator.reserve('r', { provider: 'imdb' }, notify).finish(reply());
    navigator.reserve('r2', { provider: 'imdb' }, notify).finish(reply('imdb', 'r2'));
    expect(second.location.replace).not.toHaveBeenCalled();
    expect(second.close).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'rejected' }));
    const third = tab();
    const ticket = new ReferenceNavigator(() => third).reserve('r', { provider: 'imdb' }, notify);
    Object.defineProperty(third.location, 'href', {
      get() {
        throw new Error('cross-origin');
      },
    });
    ticket.finish(reply());
    expect(third.close).not.toHaveBeenCalled();
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'blocked' }));
  });
});

describe('authorization of typed actions', () => {
  it('requires matching request, provider, action, exact URL and catalog resource', () => {
    expect(validatedReference(null, 'r', { provider: 'imdb' })).toBeNull();
    expect(validatedReference(reply(), 'other', { provider: 'imdb' })).toBeNull();
    expect(validatedReference(reply(), 'r', { provider: 'google_books' })).toBeNull();
    const mutations: Array<(response: ChatResponse) => void> = [
      response => {
        response.actions = [];
      },
      response => {
        response.actions = undefined;
      },
      response => {
        response.actions![0].type = undefined;
      },
      response => {
        response.actions![0].requestId = 'other';
      },
      response => {
        response.actions![0].resourceId = 'tt0000000';
      },
      response => {
        response.actions![0].id = 'bad id';
      },
      response => {
        response.actions![0].id = 'trailing-newline\n';
      },
      response => {
        response.actions![0].url = 'javascript:alert(1)';
      },
      response => {
        response.movies = [];
      },
      response => {
        response.movies!.push(response.movies![0]);
      },
      response => {
        response.movies![0].imdb = null;
      },
    ];
    for (const mutate of mutations) {
      const response = reply();
      mutate(response);
      expect(validatedReference(response, 'r', { provider: 'imdb' })).toBeNull();
    }
    const book = reply('google_books');
    book.comparison!.adaptation.status = 'uncertain';
    expect(validatedReference(book, 'r', { provider: 'google_books' })).toBeNull();
    book.comparison = null;
    expect(validatedReference(book, 'r', { provider: 'google_books' })).toBeNull();
    const different = reply('google_books');
    different.actions![0].resourceId = 'other';
    different.actions![0].url = 'https://books.google.com/books?id=other';
    expect(validatedReference(different, 'r', { provider: 'google_books' })).toBeNull();
    expect(
      validatedReference(reply('google_books'), 'r', { provider: 'google_books' })
    ).toMatchObject({ resourceId: 'book' });
  });
});
