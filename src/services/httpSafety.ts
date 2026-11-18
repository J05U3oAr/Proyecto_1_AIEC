import { ChatServiceError } from '@/services/chatErrors';

export const DEFAULT_CHAT_TIMEOUT_MS = 65_000;
export const MAX_RESPONSE_BYTES = 256 * 1024;

/** Endpoint is integrator configuration, never model output. Tokens are bound to its exact value. */
export function validateChatEndpoint(endpoint: string): string {
  if (/[\s\\]/u.test(endpoint) || endpoint.startsWith('//'))
    throw new Error('Endpoint de chat inválido');
  const url = new URL(endpoint, 'https://widget.invalid');
  const isRelative = endpoint.startsWith('/');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (!isRelative && url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    (!isRelative && !/^https?:\/\//.test(endpoint)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/chat')
  ) {
    throw new Error('Endpoint de chat inválido');
  }
  return endpoint;
}

export async function readResponseJson(response: Response): Promise<unknown> {
  const invalid = () =>
    new ChatServiceError(
      'invalid_response',
      'La respuesta del agente no tiene el formato esperado'
    );
  if (!/^application\/json(?:;|$)/i.test(response.headers.get('Content-Type') ?? ''))
    throw invalid();
  if (Number(response.headers.get('Content-Length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw invalid();
  }
  if (!response.body) throw invalid();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw invalid();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text);
    } catch {
      throw invalid();
    }
  } finally {
    reader.releaseLock();
  }
}

export function httpFailure(response: Response): ChatServiceError {
  const status = response.status;
  const messages: Record<number, string> = {
    401: 'La sesión expiró. Tu historial sigue visible; el siguiente mensaje iniciará una sesión nueva.',
    409: 'Ya hay una solicitud en curso o existe un conflicto. Espera antes de volver a enviar.',
    413: 'El mensaje supera el tamaño permitido. Acórtalo antes de enviarlo.',
    422: 'No pude procesar esa solicitud. Revisa el mensaje antes de enviarlo.',
    429: 'El catálogo o el agente alcanzó su límite de consultas. Inténtalo más tarde.',
    503: 'No puedo consultar el catálogo o el agente ahora. Inténtalo más tarde.',
    504: 'El agente tardó demasiado. No se reintentó automáticamente.',
  };
  const retryAfter = response.headers.get('Retry-After');
  const seconds =
    retryAfter !== null && /^\d{1,5}$/.test(retryAfter) ? Number(retryAfter) : undefined;
  return new ChatServiceError(
    'http',
    `${messages[status] ?? 'No fue posible enviar el mensaje'} (${status})`,
    status,
    seconds
  );
}
