import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GALACTIC_GUIDE_RESPONSE } from '@/mocks/mockData';
import { handlers } from '@/mocks/handlers';
import { HttpChatService } from '@/services/chatService';

const server = setupServer(...handlers);
const chatService = new HttpChatService('http://localhost/api/chat');

describe('HttpChatService', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('recibe la respuesta Markdown del endpoint interceptado por MSW', async () => {
    const response = await chatService.sendMessage(
      '¿Cuál es la respuesta a la vida, el universo y todo?'
    );

    expect(response).toEqual({ response: GALACTIC_GUIDE_RESPONSE });
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
