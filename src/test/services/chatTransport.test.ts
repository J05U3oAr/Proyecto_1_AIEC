import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpChatService } from '@/services/chatService';
import { MAX_RESPONSE_BYTES, readResponseJson, validateChatEndpoint } from '@/services/httpSafety';
import { useChatStore } from '@/store/useChatStore';
import fixture from '../../../docs/integration/fixtures/m3-comparison-valid.json';
import { navigationFixture } from '@/mocks/cinemaFixtures';

const json = (value: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('bounded chat transport (fetch doubles only)', () => {
  beforeEach(() => useChatStore.getState().clearChat());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('passes explicit navigation context and the same request ID to the backend without opening a tab itself', async () => {
    const open = vi.spyOn(window, 'open');
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      expect(request).toMatchObject({
        requestId: 'navigation-test',
        navigationIntent: { provider: 'imdb' },
      });
      return json(navigationFixture({ provider: 'imdb' }, request.requestId));
    });
    vi.stubGlobal('fetch', fetchMock);
    await new HttpChatService().sendMessage('Abre IMDb', {
      requestId: 'navigation-test',
      navigationIntent: { provider: 'imdb' },
    });
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
  it('rejects navigation metadata that disagrees with the actual current command', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const options = {
      requestId: 'navigation-test',
      navigationIntent: { provider: 'imdb' as const },
    };
    await expect(
      new HttpChatService().sendMessage('Recomienda una película', options)
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(
      new HttpChatService().sendMessage('Abre Google Books', options)
    ).rejects.toMatchObject({ code: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retains enriched fields and accepts null session/request IDs from v1', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      return json({ ...fixture.response, requestId: request.requestId, sessionId: null });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await new HttpChatService().sendMessage('Blade Runner');
    expect(response.movies).toEqual(fixture.response.movies);
    expect(response.comparison).toEqual(fixture.response.comparison);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['', '  ', ' Hola ', 'x'.repeat(4001), '\u0001'.repeat(4000)])(
    'rejects invalid/oversized input locally %#',
    async prompt => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(new HttpChatService().sendMessage(prompt)).rejects.toMatchObject({
        code: 'invalid_request',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('rejects a response for a different request before retaining its session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          { response: 'x', requestId: 'other', sessionId: 's' },
          { 'X-Session-Token': 'synthetic' }
        )
      )
    );
    await expect(new HttpChatService().sendMessage('Hola')).rejects.toMatchObject({
      code: 'invalid_response',
    });
    expect(useChatStore.getState().session).toBeNull();
  });

  it.each([401, 409, 413, 422, 429, 500, 503, 504])(
    'does not retry HTTP %s or expose upstream messages',
    async status => {
      const fetchMock = vi.fn(
        async () =>
          new Response('synthetic-private-canary', { status, headers: { 'Retry-After': '30' } })
      );
      vi.stubGlobal('fetch', fetchMock);
      const failure = await new HttpChatService()
        .sendMessage('Hola')
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({ code: 'http', status, retryAfterSeconds: 30 });
      expect(String(failure)).not.toContain('synthetic-private-canary');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it('ignores malformed retry metadata and sanitizes network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 429, headers: { 'Retry-After': 'evil' } }))
    );
    await expect(new HttpChatService().sendMessage('Hola')).rejects.toMatchObject({
      retryAfterSeconds: undefined,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('synthetic-private-canary');
      })
    );
    await expect(new HttpChatService().sendMessage('Hola')).rejects.toMatchObject({
      code: 'network',
      message: expect.not.stringContaining('synthetic-private-canary'),
    });
  });

  it('aborts on deadline, frees the send lock and never retries', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new HttpChatService('/api/chat', 100);
    const failed = expect(service.sendMessage('Hola')).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(101);
    await failed;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockImplementation(async () => json({ response: 'recovered' }));
    await expect(service.sendMessage('Otra consulta manual')).resolves.toEqual({
      response: 'recovered',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('applies the deadline to body reading as well as headers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url: string, init: RequestInit) =>
          new Response(
            new ReadableStream({
              start(controller) {
                init.signal?.addEventListener('abort', () =>
                  controller.error(new DOMException('aborted', 'AbortError'))
                );
              },
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    const failed = expect(
      new HttpChatService('/api/chat', 100).sendMessage('Hola')
    ).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(101);
    await failed;
  });

  it('cancels a pending request even before its first session exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('cancelled')));
          })
      )
    );
    const service = new HttpChatService();
    const failure = expect(service.sendMessage('Hola')).rejects.toMatchObject({ code: 'network' });
    await service.clearSession();
    await failure;
  });

  it('bounds remote deletion and does not delete a session issued by another endpoint', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('cancelled')));
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new HttpChatService('/api/chat', 100);
    useChatStore
      .getState()
      .setSession({ id: 's', token: 'synthetic-token', endpoint: '/other/chat' });
    await service.clearSession();
    expect(fetchMock).not.toHaveBeenCalled();
    useChatStore
      .getState()
      .setSession({ id: 's', token: 'synthetic-token', endpoint: '/api/chat' });
    const failed = expect(service.clearSession()).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(101);
    await failed;
    expect(useChatStore.getState().session).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('HTTP resource bounds and configuration', () => {
  it.each([
    '/api/chat',
    '/prefix/api/chat',
    'https://agent.example/api/chat',
    'http://127.0.0.1:8000/api/chat',
    'http://localhost:8000/api/chat',
    'http://[::1]:8000/api/chat',
  ])('accepts integrator endpoint %s', endpoint => {
    expect(validateChatEndpoint(endpoint)).toBe(endpoint);
  });
  it.each([
    '//evil.test/chat',
    'http://agent.example/chat',
    'javascript:alert(1)',
    'ftp://agent.test/chat',
    'https://user:pass@agent.test/chat',
    'https://agent.test/chat?token=x',
    'https://agent.test/chat#x',
    '/api/chat\n',
    '/api\\chat',
    '/api/other',
    'api/chat',
  ])('rejects unsafe endpoint %s', endpoint =>
    expect(() => validateChatEndpoint(endpoint)).toThrow()
  );
  it.each([0, -1, NaN, Infinity])('rejects invalid deadline %s', timeout =>
    expect(() => new HttpChatService('/api/chat', timeout)).toThrow()
  );
  it('reads UTF-8 JSON across chunks', async () => {
    const bytes = new TextEncoder().encode('{"response":"película 😀"}');
    const body = new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    await expect(
      readResponseJson(
        new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      )
    ).resolves.toEqual({ response: 'película 😀' });
  });
  it.each([
    () => new Response('hello'),
    () => new Response('{bad json', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response(null, { headers: { 'Content-Type': 'application/json' } }),
    () => json({ response: 'x' }, { 'Content-Length': String(MAX_RESPONSE_BYTES + 1) }),
    () => json({ response: 'x'.repeat(MAX_RESPONSE_BYTES + 1) }),
  ])('rejects bad type, JSON or size %#', async makeResponse => {
    await expect(readResponseJson(makeResponse())).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});
