import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import fixture from '../../../docs/integration/fixtures/m3-comparison-valid.json';

import { DemoApp } from '@/demo/DemoApp';
import { resetMockScenario, setMockScenario } from '@/mocks/demoScenario';
import { handlers } from '@/mocks/handlers';
import { useChatStore } from '@/store/useChatStore';
import App from '@/App';
import { ChatModeContext } from '@/services/ChatModeContext';

const server = setupServer(...handlers);

describe('flujo E2E del widget AGIChat', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

  beforeEach(() => {
    useChatStore.getState().clearChat();
    vi.stubEnv('VITE_CHAT_MODE', 'mock');
    useChatStore.setState({
      isOpen: false,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
    setMockScenario('code');
    window.HTMLElement.prototype.scrollTo = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    server.resetHandlers();
    resetMockScenario();
  });

  afterAll(() => server.close());

  it('recorre las fichas de cine y los estados de comparación desde los controles mock', async () => {
    const open = vi.spyOn(window, 'open');
    render(
      <ChatModeContext.Provider value="mock">
        <App />
      </ChatModeContext.Provider>
    );
    for (const name of [
      /Ver recomendación simulada/,
      /Ver comparación simulada/,
      /Vínculo incierto/,
      /Datos parciales/,
      /Sin adaptación confirmada/,
    ]) {
      fireEvent.click(screen.getByRole('button', { name }));
      await waitFor(() => expect(useChatStore.getState().isTyping).toBe(false), { timeout: 4000 });
      expect(useChatStore.getState().messages.slice(-1)[0].details?.movies?.[0].title).toBe(
        'Blade Runner'
      );
    }
    expect(screen.getAllByRole('article', { name: 'Película: Blade Runner' })).toHaveLength(5);
    expect(screen.getAllByAltText('Powered by Google').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /Ver libro en Google Books/ }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/No confirma que el libro no exista/)).toBeInTheDocument();
    expect(screen.getAllByText('Póster no disponible')).toHaveLength(5);
    expect(open).not.toHaveBeenCalled();
  }, 15000);

  it('abre, envía una pregunta, renderiza código Markdown, copia y limpia el chat', async () => {
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat' }));
    const prompt = 'Genera un ejemplo de código';
    const input = screen.getByRole('textbox', { name: /campo de texto/i });

    fireEvent.change(input, { target: { value: prompt } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText(prompt)).toBeInTheDocument();
    const copyButton = await screen.findByRole(
      'button',
      { name: 'Copiar código' },
      { timeout: 5_000 }
    );
    expect(screen.getByText('AGIChatWidget')).toBeInTheDocument();

    fireEvent.click(copyButton);
    expect(await screen.findByRole('button', { name: 'Código copiado' })).toBeInTheDocument();
    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: prompt, status: 'sent' },
      { role: 'assistant', status: 'sent' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar chat' }));

    await waitFor(() => {
      expect(useChatStore.getState().messages).toEqual([]);
    });
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar código' })).not.toBeInTheDocument();
  });

  it('conserva respuesta enriquecida y sesión por HTTP simulado sin ejecutar ni rehidratar acciones', async () => {
    const open = vi.spyOn(window, 'open');
    const requests: Array<{ body: Record<string, unknown>; token: string | null }> = [];
    server.use(
      http.post('*/api/chat', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push({ body, token: request.headers.get('X-Session-Token') });
        return HttpResponse.json(
          {
            ...fixture.response,
            response: 'Respuesta sintética de comparación para M4.1',
            requestId: body.requestId,
            sessionId: 'e2e-session',
            actions: [
              {
                type: 'open_reference',
                id: 'a',
                requestId: body.requestId,
                provider: 'imdb',
                resourceId: 'tt0083658',
                url: 'https://www.imdb.com/title/tt0083658/',
              },
            ],
          },
          { headers: { 'X-Session-Token': 'synthetic-e2e-token' } }
        );
      })
    );
    render(<DemoApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat' }));
    const input = screen.getByRole('textbox', { name: /campo de texto/i });
    for (const prompt of ['Recomienda una película', 'Compárala con el libro']) {
      fireEvent.change(input, { target: { value: prompt } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
      await waitFor(() => expect(useChatStore.getState().isTyping).toBe(false));
    }
    expect(requests).toHaveLength(2);
    expect(requests[1].body).toMatchObject({ sessionId: 'e2e-session' });
    expect(requests[1].token).toBe('synthetic-e2e-token');
    expect(useChatStore.getState().messages[3].details?.comparison).toEqual(
      fixture.response.comparison
    );
    const snapshot = localStorage.getItem('agichat-conversation')!;
    expect(snapshot).not.toContain('actions');
    expect(snapshot).not.toContain('synthetic-e2e-token');
    useChatStore.getState().clearChat();
    localStorage.setItem('agichat-conversation', snapshot);
    await useChatStore.persist.rehydrate();
    expect(useChatStore.getState().messages).toHaveLength(4);
    expect(useChatStore.getState().session).toBeNull();
    expect(open).not.toHaveBeenCalled();
    expect(requests).toHaveLength(2);
    open.mockRestore();
  });
});
