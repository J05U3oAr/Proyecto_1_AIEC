import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { resetMockScenario, setMockScenario } from '@/mocks/demoScenario';
import { GALACTIC_GUIDE_RESPONSE, TABLE_DEMO_RESPONSE } from '@/mocks/mockData';
import { handlers } from '@/mocks/handlers';
import { HttpChatService } from '@/services/chatService';
import { useChatStore } from '@/store/useChatStore';

const server = setupServer(...handlers);
const chatService = new HttpChatService('http://localhost/api/chat');

describe('HttpChatService', () => {
  beforeEach(() => useChatStore.getState().clearChat());
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    vi.restoreAllMocks();
    server.resetHandlers();
    resetMockScenario();
  });
  afterAll(() => server.close());

  it('recibe la respuesta Markdown del endpoint interceptado por MSW', async () => {
    const response = await chatService.sendMessage(
      '¿Cuál es la respuesta a la vida, el universo y todo?'
    );

    expect(response).toEqual({ response: GALACTIC_GUIDE_RESPONSE });
  });

  it('entrega una tabla Markdown cuando el demo activa ese escenario', async () => {
    setMockScenario('table');

    await expect(chatService.sendMessage('Métricas del piloto')).resolves.toEqual({
      response: TABLE_DEMO_RESPONSE,
    });
  });

  it('simula una caída del agente cuando el demo activa el escenario de error', async () => {
    setMockScenario('error');

    await expect(chatService.sendMessage('¿Estás disponible?')).rejects.toThrow('503');
  });

  it('propaga un error HTTP del agente', async () => {
    server.use(
      http.post('http://localhost/api/chat', () => new HttpResponse(null, { status: 503 }))
    );

    await expect(chatService.sendMessage('Hola')).rejects.toThrow('503');
  });

  it('rechaza una respuesta sin el contrato esperado', async () => {
    server.use(
      http.post('http://localhost/api/chat', () => HttpResponse.json({ message: 'Hola' }))
    );

    await expect(chatService.sendMessage('Hola')).rejects.toThrow('formato esperado');
  });

  it('conserva la sesión entre turnos sin persistir el token', async () => {
    const { useChatStore } = await import('@/store/useChatStore');
    useChatStore.getState().clearChat();
    const requests: Array<{ body: unknown; token: string | null }> = [];
    const local = new HttpChatService('http://localhost/api/chat');
    server.use(
      http.post('http://localhost/api/chat', async ({ request }) => {
        requests.push({
          body: await request.json(),
          token: request.headers.get('X-Session-Token'),
        });
        return HttpResponse.json(
          { response: 'Opciones', sessionId: 'session-1' },
          {
            headers: { 'X-Session-Token': 'synthetic-session-token' },
          }
        );
      })
    );
    await local.sendMessage('Cars');
    await local.sendMessage('2006');
    expect(requests[1].body).toMatchObject({ prompt: '2006', sessionId: 'session-1' });
    expect(requests[1].token).toBe('synthetic-session-token');
    expect(localStorage.getItem('agichat-conversation')).not.toContain('synthetic-session-token');
    useChatStore.getState().clearChat();
  });

  it('rechaza una sesión incompleta y descarta la credencial expirada', async () => {
    const local = new HttpChatService('http://localhost/api/chat');
    server.use(
      http.post('http://localhost/api/chat', () =>
        HttpResponse.json({ response: 'Hola', sessionId: 'session-1' })
      )
    );
    await expect(local.sendMessage('Hola')).rejects.toThrow('sesión');
    useChatStore.getState().setSession({
      id: 'session-1',
      token: 'synthetic-token',
      endpoint: 'http://localhost/api/chat',
    });
    server.use(
      http.post('http://localhost/api/chat', () => new HttpResponse(null, { status: 401 }))
    );
    await expect(local.sendMessage('Cars')).rejects.toThrow('401');
    expect(useChatStore.getState().session).toBeNull();
  });

  it('no envía credenciales de sesión a otro endpoint', async () => {
    useChatStore
      .getState()
      .setSession({ id: 's', token: 'synthetic-token', endpoint: 'http://localhost/other/chat' });
    server.use(
      http.post('http://localhost/api/chat', ({ request }) => {
        expect(request.headers.has('X-Session-Token')).toBe(false);
        return HttpResponse.json({ response: 'Sin sesión previa' });
      })
    );
    await new HttpChatService('http://localhost/api/chat').sendMessage('Hola');
  });

  it('impide doble envío y descarta respuestas de una conversación reiniciada', async () => {
    let release = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    server.use(
      http.post('http://localhost/api/chat', async () => {
        await gate;
        return HttpResponse.json(
          { response: 'Vieja', sessionId: 'old' },
          {
            headers: { 'X-Session-Token': 'synthetic-token' },
          }
        );
      })
    );
    const local = new HttpChatService('http://localhost/api/chat');
    const pending = local.sendMessage('Cars');
    const rejected = expect(pending).rejects.toThrow('conversación cambió');
    await expect(local.sendMessage('2006')).rejects.toThrow('mensaje en curso');
    useChatStore.getState().clearChat();
    release();
    await rejected;
    expect(useChatStore.getState().session).toBeNull();
  });

  it('borra el contexto remoto con su token sin incluirlo en la URL', async () => {
    const local = new HttpChatService('http://localhost/api/chat');
    await local.clearSession();
    useChatStore.getState().setSession({
      id: 'session-1',
      token: 'synthetic-token',
      endpoint: 'http://localhost/api/chat',
    });
    server.use(
      http.delete('http://localhost/api/session/session-1', ({ request }) => {
        expect(request.headers.get('X-Session-Token')).toBe('synthetic-token');
        expect(request.url).not.toContain('synthetic-token');
        return new HttpResponse(null, { status: 204 });
      })
    );
    await expect(local.clearSession()).resolves.toBeUndefined();
    expect(useChatStore.getState().session).toBeNull();
    useChatStore.getState().setSession({
      id: 'session-1',
      token: 'synthetic-token',
      endpoint: 'http://localhost/api/chat',
    });
    server.use(
      http.delete(
        'http://localhost/api/session/session-1',
        () => new HttpResponse(null, { status: 503 })
      )
    );
    await expect(local.clearSession()).rejects.toThrow('borrar la sesión');
  });

  it('no sigue redirecciones que puedan reenviar el token a otra ruta', async () => {
    useChatStore
      .getState()
      .setSession({ id: 's', token: 'synthetic-token', endpoint: 'http://localhost/api/chat' });
    let redirected = false;
    server.use(
      http.post('http://localhost/api/chat', ({ request }) => {
        expect(request.redirect).toBe('error');
        return new HttpResponse(null, {
          status: 307,
          headers: { Location: 'http://localhost/untrusted' },
        });
      }),
      http.post('http://localhost/untrusted', () => {
        redirected = true;
        return HttpResponse.json({ response: 'No debería llegar' });
      })
    );
    await expect(
      new HttpChatService('http://localhost/api/chat').sendMessage('hola')
    ).rejects.toThrow();
    expect(redirected).toBe(false);
  });
});
