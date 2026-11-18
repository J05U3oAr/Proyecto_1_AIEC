export type ChatErrorCode =
  'http' | 'timeout' | 'network' | 'invalid_response' | 'invalid_request' | 'stale' | 'session';

export class ChatServiceError extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

export interface ChatFailure {
  code: ChatErrorCode;
  message: string;
}

export function publicFailure(error: unknown): ChatFailure {
  if (error instanceof ChatServiceError) return { code: error.code, message: error.message };
  return {
    code: 'network',
    message: 'No pude conectar con el agente. No se reintentó automáticamente.',
  };
}
