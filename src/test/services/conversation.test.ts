import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitChatMessage, resetConversation } from '@/services/conversation';
import { ChatServiceError } from '@/services/chatErrors';
import { useChatStore } from '@/store/useChatStore';
import type { ChatResponse } from '@/services/types';
import fixture from '../../../docs/integration/fixtures/m3-comparison-valid.json';
import { isChatResponse } from '@/services/responseValidation';

describe('single conversation send path', () => {
  beforeEach(() => useChatStore.getState().clearChat());
  afterEach(() => vi.restoreAllMocks());

  it('retains structured data in history without executable actions, IDs or session credentials', async () => {
    if (!isChatResponse(fixture.response)) throw new Error('Invalid fixture');
    const response: ChatResponse = {
      ...fixture.response,
      sessionId: 'synthetic-session',
      actions: [
        {
          type: 'open_reference',
          id: 'a',
          requestId: 'r',
          provider: 'imdb',
          resourceId: 'tt0083658',
          url: 'https://www.imdb.com/title/tt0083658/',
        },
      ],
    };
    const service = { sendMessage: vi.fn(async () => response) };
    const open = vi.spyOn(window, 'open');
    expect(await submitChatMessage('  Blade Runner  ', service)).toBe('sent');
    expect(service.sendMessage).toHaveBeenCalledExactlyOnceWith('Blade Runner');
    const assistant = useChatStore.getState().messages[1];
    expect(assistant.details?.comparison).toEqual(fixture.response.comparison);
    expect(assistant.details).not.toHaveProperty('actions');
    expect(assistant.details).not.toHaveProperty('sessionId');
    expect(open).not.toHaveBeenCalled();
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('ignores empty, long and concurrent sends without creating duplicate messages', async () => {
    let resolve: (response: ChatResponse) => void = () => {};
    const service = {
      sendMessage: vi.fn(
        () =>
          new Promise<ChatResponse>(done => {
            resolve = done;
          })
      ),
    };
    expect(await submitChatMessage(' ', service)).toBe('ignored');
    expect(await submitChatMessage('x'.repeat(4001), service)).toBe('ignored');
    expect(useChatStore.getState().lastError?.code).toBe('invalid_request');
    const pending = submitChatMessage('Hola', service);
    expect(await submitChatMessage('Duplicado', service)).toBe('ignored');
    expect(service.sendMessage).toHaveBeenCalledTimes(1);
    resolve({ response: 'ok' });
    expect(await pending).toBe('sent');
    expect(useChatStore.getState().messages).toHaveLength(2);
    expect(useChatStore.getState().lastError).toBeNull();
  });

  it.each(['resolve', 'reject'])(
    'discards a late %s without unlocking or mutating a new turn',
    async outcome => {
      let resolve: (response: ChatResponse) => void = () => {};
      let reject: (error: Error) => void = () => {};
      const service = {
        sendMessage: () =>
          new Promise<ChatResponse>((done, fail) => {
            resolve = done;
            reject = fail;
          }),
      };
      const old = submitChatMessage('Old', service);
      useChatStore.getState().clearChat();
      useChatStore.getState().sendMessage('New');
      useChatStore.getState().setTyping(true);
      if (outcome === 'resolve') resolve({ response: 'late' });
      else reject(new Error('late'));
      expect(await old).toBe('ignored');
      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].content).toBe('New');
      expect(useChatStore.getState().isTyping).toBe(true);
    }
  );

  it('ignores a turn whose message is no longer pending', async () => {
    let oldResolve: (response: ChatResponse) => void = () => {};
    const old = submitChatMessage('Old', {
      sendMessage: () =>
        new Promise<ChatResponse>(resolve => {
          oldResolve = resolve;
        }),
    });
    useChatStore.getState().markMessageAsSent(useChatStore.getState().messages[0].id);
    oldResolve({ response: 'Old response' });
    expect(await old).toBe('ignored');
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('Old');
  });

  it('reports safe errors, leaves the failed turn and never retries', async () => {
    const service = {
      sendMessage: vi.fn(async () => {
        throw new ChatServiceError('timeout', 'Tiempo agotado');
      }),
    };
    expect(await submitChatMessage('Hola', service)).toBe('failed');
    expect(useChatStore.getState().lastError).toEqual({
      code: 'timeout',
      message: 'Tiempo agotado',
    });
    expect(useChatStore.getState().messages[0].status).toBe('error');
    service.sendMessage.mockRejectedValueOnce(new Error('private-synthetic-canary'));
    await submitChatMessage('Manual', service);
    expect(useChatStore.getState().lastError?.message).not.toContain('private-synthetic-canary');
    expect(service.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('resets the conversation with a legacy service that has no remote cleanup', () => {
    useChatStore.getState().sendMessage('Hello');
    resetConversation({ sendMessage: async () => ({ response: 'x' }) });
    expect(useChatStore.getState().messages).toEqual([]);
  });
});
