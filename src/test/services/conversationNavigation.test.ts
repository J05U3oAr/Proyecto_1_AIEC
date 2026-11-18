import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelNavigationFor, resetConversation, submitChatMessage } from '@/services/conversation';
import { useChatStore } from '@/store/useChatStore';
import { navigationFixture } from '@/mocks/cinemaFixtures';
import type { ChatResponse, ChatSendOptions, IChatService } from '@/services/types';
import type { ReservedTab } from '@/services/referenceNavigation';

function reservedTab(): ReservedTab {
  return {
    closed: false,
    opener: {},
    location: { href: 'about:blank', replace: vi.fn() },
    close: vi.fn(),
  };
}

describe('conversation navigation lifecycle (offline doubles)', () => {
  beforeEach(() => useChatStore.getState().clearChat());
  afterEach(() => vi.restoreAllMocks());

  it.each(['imdb', 'google_books'] as const)(
    'reserves before the HTTP await and sends only the current %s intent',
    async provider => {
      const child = reservedTab();
      const open = vi.spyOn(window, 'open').mockReturnValue(child as Window);
      const service: IChatService = {
        sendMessage: vi.fn(async (_prompt: string, options?: ChatSendOptions) => {
          expect(open).toHaveBeenCalledTimes(1);
          expect(child.opener).toBeNull();
          expect(options?.navigationIntent).toEqual({ provider });
          return navigationFixture({ provider }, options!.requestId);
        }),
      };
      expect(
        await submitChatMessage(
          provider === 'imdb' ? 'Abre su ficha en IMDb' : 'Abre el libro en Google Books',
          service
        )
      ).toBe('sent');
      expect(child.location.replace).toHaveBeenCalledOnce();
      expect(useChatStore.getState().navigationNotice?.status).toBe('requested');
      expect(localStorage.getItem('agichat-conversation')).not.toContain('actions');
      expect(localStorage.getItem('agichat-conversation')).not.toContain('navigationNotice');
      const snapshot = localStorage.getItem('agichat-conversation')!;
      useChatStore.getState().clearChat();
      localStorage.setItem('agichat-conversation', snapshot);
      await useChatStore.persist.rehydrate();
      expect(open).toHaveBeenCalledTimes(1);
      expect(useChatStore.getState().navigationNotice).toBeNull();
    }
  );

  it.each(['reset', 'direct-clear', 'unmount', 'error'])(
    'closes the reservation on %s and ignores late actions',
    async outcome => {
      const child = reservedTab();
      vi.spyOn(window, 'open').mockReturnValue(child as Window);
      let resolve: (value: ChatResponse) => void = () => {};
      let reject: (error: Error) => void = () => {};
      let options: ChatSendOptions | undefined;
      const service: IChatService = {
        sendMessage: (_prompt, current) => {
          options = current;
          return new Promise((done, fail) => {
            resolve = done;
            reject = fail;
          });
        },
      };
      const pending = submitChatMessage('Abre IMDb', service);
      const duplicate = await submitChatMessage('Abre IMDb', service);
      expect(duplicate).toBe('ignored');
      if (outcome === 'reset') resetConversation(service);
      if (outcome === 'direct-clear') useChatStore.getState().clearChat();
      if (outcome === 'unmount') cancelNavigationFor(service);
      if (outcome === 'error') reject(new Error('offline'));
      else resolve(navigationFixture({ provider: 'imdb' }, options!.requestId));
      await pending;
      expect(child.close).toHaveBeenCalledOnce();
      expect(child.location.replace).not.toHaveBeenCalled();
    }
  );

  it('keeps fallback only for a validated action when popups are blocked, with no retry', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const service: IChatService = {
      sendMessage: async (_prompt, options) =>
        navigationFixture({ provider: 'imdb' }, options!.requestId),
    };
    await submitChatMessage('Abre IMDb', service);
    expect(useChatStore.getState().navigationNotice?.fallback?.url).toMatch(
      /^https:\/\/www.imdb.com\//
    );
    expect(open).toHaveBeenCalledOnce();
  });
  it('never opens for recommendations, negated commands, or response-only instructions', async () => {
    const open = vi.spyOn(window, 'open');
    const service = {
      sendMessage: vi.fn(async () => navigationFixture({ provider: 'imdb' }, 'unsolicited')),
    };
    await submitChatMessage('Recomienda una película', service);
    await submitChatMessage('No abras IMDb', service);
    expect(open).not.toHaveBeenCalled();
    expect(service.sendMessage).toHaveBeenCalledWith('Recomienda una película');
    expect(service.sendMessage).toHaveBeenCalledWith('No abras IMDb');
  });
  it('closes on absent or invalid actions and does not give a malicious fallback', async () => {
    const child = reservedTab();
    vi.spyOn(window, 'open').mockReturnValue(child as Window);
    await submitChatMessage('Abre IMDb', {
      sendMessage: async () => ({ response: 'No confirmed reference' }),
    });
    expect(child.close).toHaveBeenCalledOnce();
    expect(useChatStore.getState().navigationNotice).toMatchObject({ status: 'rejected' });
    expect(useChatStore.getState().navigationNotice?.fallback).toBeUndefined();
  });
});
