import type { ChatRequest, ChatResponse, IChatService } from '@/services/types';

const isChatResponse = (value: unknown): value is ChatResponse =>
  typeof value === 'object' &&
  value !== null &&
  'response' in value &&
  typeof value.response === 'string';

export class HttpChatService implements IChatService {
  constructor(private readonly endpoint = '/api/chat') {}

  async sendMessage(prompt: string): Promise<ChatResponse> {
    const request: ChatRequest = { prompt };
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`No fue posible enviar el mensaje (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isChatResponse(payload)) {
      throw new Error('La respuesta del agente no tiene el formato esperado');
    }

    return payload;
  }
}

export const chatService: IChatService = new HttpChatService();
