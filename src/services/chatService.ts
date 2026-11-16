import type { ChatRequest, ChatResponse, IChatService } from '@/services/types';
import { useChatStore } from '@/store/useChatStore';

const identifier = /^[A-Za-z0-9_-]{1,128}$/;
const isChatResponse = (value: unknown): value is ChatResponse =>
  typeof value === 'object' &&
  value !== null &&
  'response' in value &&
  typeof value.response === 'string' &&
  (!('sessionId' in value) ||
    (typeof value.sessionId === 'string' && identifier.test(value.sessionId)));

export class HttpChatService implements IChatService {
  private active: { version: number; controller: AbortController } | null = null;

  constructor(private readonly endpoint = '/api/chat') {}

  async sendMessage(prompt: string): Promise<ChatResponse> {
    const state = useChatStore.getState();
    if (this.active?.version === state.conversationVersion) {
      throw new Error('Hay un mensaje en curso. Espera la respuesta.');
    }
    this.active?.controller.abort();
    const active = { version: state.conversationVersion, controller: new AbortController() };
    this.active = active;
    // Tokens stay in memory and are sent only to the endpoint that issued them.
    const session = state.session?.endpoint === this.endpoint ? state.session : null;
    const request: ChatRequest = {
      prompt,
      requestId: crypto.randomUUID(),
      ...(session ? { sessionId: session.id } : {}),
    };
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: active.controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'X-Session-Token': session.token } : {}),
        },
        body: JSON.stringify(request),
      });
      if (useChatStore.getState().conversationVersion !== active.version) {
        throw new Error('La conversación cambió; se descartó la respuesta anterior.');
      }
      if (!response.ok) {
        if (response.status === 401) useChatStore.getState().setSession(null);
        throw new Error(`No fue posible enviar el mensaje (${response.status})`);
      }
      const payload: unknown = await response.json();
      if (useChatStore.getState().conversationVersion !== active.version) {
        throw new Error('La conversación cambió; se descartó la respuesta anterior.');
      }
      if (!isChatResponse(payload)) {
        throw new Error('La respuesta del agente no tiene el formato esperado');
      }
      const token = response.headers.get('X-Session-Token');
      if (payload.sessionId) {
        if (!token || !identifier.test(token)) {
          throw new Error('La sesión del agente no tiene el formato esperado');
        }
        useChatStore
          .getState()
          .setSession({ id: payload.sessionId, token, endpoint: this.endpoint });
      }
      return payload;
    } finally {
      if (this.active === active) this.active = null;
    }
  }

  async clearSession(): Promise<void> {
    const session = useChatStore.getState().session;
    if (!session || session.endpoint !== this.endpoint) return;
    this.active?.controller.abort();
    useChatStore.getState().setSession(null);
    const endpoint = this.endpoint.replace(/\/chat$/, '/session');
    const response = await fetch(`${endpoint}/${encodeURIComponent(session.id)}`, {
      method: 'DELETE',
      redirect: 'error',
      headers: { 'X-Session-Token': session.token },
    });
    if (!response.ok && response.status !== 401) {
      throw new Error('No pude borrar la sesión del servidor.');
    }
  }
}

export const chatService: IChatService = new HttpChatService();
