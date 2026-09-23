import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { resetMockScenario, setMockScenario } from '@/mocks/demoScenario';
import { GALACTIC_GUIDE_RESPONSE, TABLE_DEMO_RESPONSE } from '@/mocks/mockData';
import { handlers } from '@/mocks/handlers';
import { HttpChatService } from '@/services/chatService';

const server = setupServer(...handlers);
const chatService = new HttpChatService('http://localhost/api/chat');

describe('HttpChatService', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
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
});
