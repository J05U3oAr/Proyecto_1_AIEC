import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HISTORY_VERSION,
  MAX_HISTORY_BYTES,
  MAX_HISTORY_MESSAGES,
  restoreHistory,
} from '@/store/historyPersistence';
import { useChatStore } from '@/store/useChatStore';
import fixture from '../../../docs/integration/fixtures/m3-comparison-valid.json';
import { isChatResponse, responseDetails } from '@/services/responseValidation';

const oldMessage = {
  id: 'old',
  role: 'assistant',
  content: 'Saved text',
  timestamp: 1,
  status: 'sent',
};

describe('versioned history persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useChatStore.getState().clearChat();
  });

  it('migrates v0 snapshots preserving text and marking interrupted sends as failed', async () => {
    localStorage.setItem(
      'agichat-conversation',
      JSON.stringify({
        version: 0,
        state: { messages: [oldMessage, { ...oldMessage, id: 'pending', status: 'sending' }] },
      })
    );
    await useChatStore.persist.rehydrate();
    expect(useChatStore.getState().messages).toEqual([
      oldMessage,
      { ...oldMessage, id: 'pending', status: 'error' },
    ]);
    expect(useChatStore.getState().isTyping).toBe(false);
    expect(JSON.parse(localStorage.getItem('agichat-conversation')!).version).toBe(HISTORY_VERSION);
  });

  it.each([0, HISTORY_VERSION])(
    'never restores sessions, live flags or executable actions from version %s',
    async version => {
      const open = vi.spyOn(window, 'open');
      localStorage.setItem(
        'agichat-conversation',
        JSON.stringify({
          version,
          state: {
            session: { id: 's', token: 'synthetic-credential', endpoint: '/api/chat' },
            conversationVersion: 99999,
            isTyping: true,
            lastError: { message: 'injected' },
            messages: [
              {
                ...oldMessage,
                actions: [{ type: 'open_reference' }],
                token: 'synthetic-credential',
              },
            ],
          },
        })
      );
      await useChatStore.persist.rehydrate();
      expect(useChatStore.getState().messages).toEqual([oldMessage]);
      expect(useChatStore.getState().session).toBeNull();
      expect(useChatStore.getState().conversationVersion).not.toBe(99999);
      expect(useChatStore.getState().lastError).toBeNull();
      expect(useChatStore.getState().isTyping).toBe(false);
      expect(open).not.toHaveBeenCalled();
      open.mockRestore();
    }
  );

  it('persists structured fields and restores them without request IDs or credentials', async () => {
    if (!isChatResponse(fixture.response)) throw new Error('Invalid fixture');
    const details = responseDetails(fixture.response);
    useChatStore.getState().receiveMessage('Comparison', details);
    useChatStore
      .getState()
      .setSession({ id: 's', token: 'synthetic-credential', endpoint: '/api/chat' });
    const snapshot = localStorage.getItem('agichat-conversation')!;
    expect(snapshot).toContain('Blade Runner');
    expect(snapshot).not.toContain('synthetic-credential');
    expect(snapshot).not.toContain('requestId');
    expect(snapshot).not.toContain('actions');
    const parsed = JSON.parse(snapshot);
    expect(restoreHistory(parsed.state).messages[0].details).toEqual(details);
  });

  it('filters malformed messages and invalid enriched fields without losing valid legacy text', () => {
    expect(restoreHistory(null)).toEqual({ messages: [] });
    expect(restoreHistory({ messages: 'bad' })).toEqual({ messages: [] });
    expect(
      restoreHistory({
        messages: [
          null,
          {},
          { ...oldMessage, timestamp: NaN },
          { ...oldMessage, id: 'x'.repeat(129) },
          { ...oldMessage, role: 'system' },
          { ...oldMessage, content: 'x'.repeat(16001) },
          { ...oldMessage, status: 'bad' },
        ],
      }).messages
    ).toEqual([]);
    expect(
      restoreHistory({
        messages: [
          {
            ...oldMessage,
            details: { sources: [{ provider: 'tmdb', label: 'x', url: 'javascript:alert(1)' }] },
          },
        ],
      }).messages
    ).toEqual([oldMessage]);
  });

  it('bounds the snapshot by number and UTF-8 byte size, keeping the newest messages', () => {
    expect(
      restoreHistory({ messages: [{ ...oldMessage, content: '😀'.repeat(16000) }] }).messages
    ).toHaveLength(1);
    const many = Array.from({ length: MAX_HISTORY_MESSAGES + 20 }, (_, index) => ({
      ...oldMessage,
      id: String(index),
      content: `Message ${index}`,
    }));
    const byCount = restoreHistory({ messages: many });
    expect(byCount.messages).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(byCount.messages[0].id).toBe('20');
    const byBytes = restoreHistory({
      messages: many.map(item => ({ ...item, content: '😀'.repeat(7500) })),
    });
    expect(byBytes.messages.length).toBeLessThan(MAX_HISTORY_MESSAGES);
    expect(new TextEncoder().encode(JSON.stringify(byBytes)).length).toBeLessThan(
      MAX_HISTORY_BYTES + MAX_HISTORY_MESSAGES + 100
    );
    expect(byBytes.messages.slice(-1)[0].id).toBe('119');
  });

  it('discards unknown future snapshot versions rather than restoring live state', async () => {
    localStorage.setItem(
      'agichat-conversation',
      JSON.stringify({ version: HISTORY_VERSION + 1, state: { messages: [oldMessage] } })
    );
    await useChatStore.persist.rehydrate();
    expect(useChatStore.getState().messages).toEqual([]);
  });
});
