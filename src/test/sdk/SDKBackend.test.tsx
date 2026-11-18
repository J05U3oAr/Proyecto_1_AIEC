import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGIChatWidget } from '@/sdk';
import { useChatStore } from '@/store/useChatStore';

describe('embedded SDK HTTP boundary (no real backend)', () => {
  beforeEach(() => {
    useChatStore.getState().clearChat();
    useChatStore.setState({ isOpen: true, isExpanded: false });
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  const send = (content: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: /campo de texto/i }), {
      target: { value: content },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
  };

  it('uses the configured backend, retains its session in memory and clears it on reset', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        requests.push({ url, init });
        if (init.method === 'DELETE') return new Response(null, { status: 204 });
        const body = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            response: `Response ${body.prompt}`,
            requestId: body.requestId,
            sessionId: 'sdk-session',
            movies: [],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': 'synthetic-sdk-token',
            },
          }
        );
      })
    );
    render(
      <AGIChatWidget
        apiEndpoint="https://agent.example/api/chat"
        theme="dark"
        position="top-left"
      />
    );
    await waitFor(() =>
      expect(screen.getByText('Modo real · consultas al agente al enviar')).toBeVisible()
    );
    send('First');
    await waitFor(() => expect(screen.getByText('Response First')).toBeVisible());
    send('Second');
    await waitFor(() => expect(screen.getByText('Response Second')).toBeVisible());
    expect(requests.map(request => request.url)).toEqual([
      'https://agent.example/api/chat',
      'https://agent.example/api/chat',
    ]);
    expect(JSON.parse(String(requests[1].init.body))).toMatchObject({
      prompt: 'Second',
      sessionId: 'sdk-session',
    });
    expect(new Headers(requests[1].init.headers).get('X-Session-Token')).toBe(
      'synthetic-sdk-token'
    );
    expect(localStorage.getItem('agichat-conversation')).not.toContain('synthetic-sdk-token');
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar chat' }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].url).toBe('https://agent.example/api/session/sdk-session');
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('does not send an old credential when the integrator changes backend', async () => {
    const tokens: Array<string | null> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        tokens.push(new Headers(init.headers).get('X-Session-Token'));
        return new Response(
          JSON.stringify({ response: `Response ${tokens.length}`, sessionId: 's' }),
          { headers: { 'Content-Type': 'application/json', 'X-Session-Token': 'synthetic-token' } }
        );
      })
    );
    const { rerender } = render(<AGIChatWidget apiEndpoint="https://first.example/api/chat" />);
    send('First');
    await screen.findByText('Response 1');
    rerender(<AGIChatWidget apiEndpoint="https://second.example/api/chat" />);
    send('Second');
    await screen.findByText('Response 2');
    expect(tokens).toEqual([null, null]);
  });

  it('aborts the HTTP request when the embedding is removed', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = init.signal ?? undefined;
            signal?.addEventListener('abort', () => reject(new Error('cancelled')));
          })
      )
    );
    const { unmount } = render(<AGIChatWidget apiEndpoint="https://agent.example/api/chat" />);
    send('Pending');
    await act(async () => unmount());
    expect(signal?.aborted).toBe(true);
    expect(useChatStore.getState().messages[0].status).toBe('error');
    expect(useChatStore.getState().isTyping).toBe(false);
  });
});
