import type { ChatRequest, ChatResponse, IChatService } from '@/services/types';
import { useChatStore } from '@/store/useChatStore';
import { isChatRequest, isChatResponse } from '@/services/responseValidation';
import { ChatServiceError } from '@/services/chatErrors';
import {
  DEFAULT_CHAT_TIMEOUT_MS,
  httpFailure,
  readResponseJson,
  validateChatEndpoint,
} from '@/services/httpSafety';

const identifier = /^[A-Za-z0-9_-]{1,128}$/;

export class HttpChatService implements IChatService {
  private active: { version: number; controller: AbortController } | null = null;

  private readonly endpoint: string;

  constructor(
    endpoint = '/api/chat',
    private readonly timeoutMs = DEFAULT_CHAT_TIMEOUT_MS
  ) {
    this.endpoint = validateChatEndpoint(endpoint);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Timeout de chat inválido');
  }

  cancelPending(): void {
    this.active?.controller.abort();
  }

  async sendMessage(prompt: string): Promise<ChatResponse> {
    const state = useChatStore.getState();
    if (this.active?.version === state.conversationVersion) {
      throw new ChatServiceError(
        'invalid_request',
        'Hay un mensaje en curso. Espera la respuesta.'
      );
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
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      active.controller.abort();
    }, this.timeoutMs);
    try {
      if (
        prompt !== prompt.trim() ||
        !isChatRequest(request) ||
        new TextEncoder().encode(JSON.stringify(request)).length > 16_384
      ) {
        throw new ChatServiceError(
          'invalid_request',
          'El mensaje debe tener entre 1 y 4000 caracteres y caber en 16 KiB.'
        );
      }
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
        throw new ChatServiceError(
          'stale',
          'La conversación cambió; se descartó la respuesta anterior.'
        );
      }
      if (!response.ok) {
        if (response.status === 401) useChatStore.getState().setSession(null);
        throw httpFailure(response);
      }
      const payload: unknown = await readResponseJson(response);
      if (useChatStore.getState().conversationVersion !== active.version) {
        throw new ChatServiceError(
          'stale',
          'La conversación cambió; se descartó la respuesta anterior.'
        );
      }
      if (!isChatResponse(payload)) {
        throw new ChatServiceError(
          'invalid_response',
          'La respuesta del agente no tiene el formato esperado'
        );
      }
      if (payload.requestId && payload.requestId !== request.requestId) {
        throw new ChatServiceError(
          'invalid_response',
          'La respuesta no corresponde a esta solicitud.'
        );
      }
      const token = response.headers.get('X-Session-Token');
      if (payload.sessionId) {
        if (!token || !identifier.test(token)) {
          throw new ChatServiceError(
            'session',
            'La sesión del agente no tiene el formato esperado'
          );
        }
        useChatStore
          .getState()
          .setSession({ id: payload.sessionId, token, endpoint: this.endpoint });
      }
      return payload;
    } catch (error) {
      if (useChatStore.getState().conversationVersion !== active.version) {
        throw new ChatServiceError(
          'stale',
          'La conversación cambió; se descartó la respuesta anterior.'
        );
      }
      if (timedOut)
        throw new ChatServiceError(
          'timeout',
          'El agente tardó demasiado. No se reintentó automáticamente.'
        );
      if (error instanceof ChatServiceError) throw error;
      throw new ChatServiceError(
        'network',
        'No pude conectar con el agente. No se reintentó automáticamente.'
      );
    } finally {
      clearTimeout(timer);
      if (this.active === active) this.active = null;
    }
  }

  async clearSession(): Promise<void> {
    const session = useChatStore.getState().session;
    this.cancelPending();
    if (!session || session.endpoint !== this.endpoint) return;
    useChatStore.getState().setSession(null);
    const endpoint = this.endpoint.replace(/\/chat$/, '/session');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(session.id)}`, {
        method: 'DELETE',
        redirect: 'error',
        headers: { 'X-Session-Token': session.token },
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 401) {
        throw new Error('No pude borrar la sesión del servidor.');
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

export const chatService: IChatService = new HttpChatService();
