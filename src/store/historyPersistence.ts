import { isRecord } from '@/services/schemaValidation';
import { isResponseDetails } from '@/services/responseValidation';
import type { Message } from '@/store/types';

export const HISTORY_VERSION = 1;
export const MAX_HISTORY_MESSAGES = 100;
export const MAX_HISTORY_BYTES = 1024 * 1024;

/** Project both old and current snapshots. Never trust localStorage to restore live state. */
export function restoreHistory(snapshot: unknown): { messages: Message[] } {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.messages)) return { messages: [] };
  const messages: Message[] = [];
  let bytes = 0;
  for (const item of snapshot.messages.slice(-MAX_HISTORY_MESSAGES).reverse()) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      item.id.length > 128 ||
      !['user', 'assistant'].includes(String(item.role)) ||
      typeof item.content !== 'string' ||
      [...item.content].length > 16_000 ||
      typeof item.timestamp !== 'number' ||
      !Number.isFinite(item.timestamp) ||
      !['sending', 'sent', 'error'].includes(String(item.status))
    )
      continue;
    const message: Message = {
      id: item.id,
      role: item.role as Message['role'],
      content: item.content,
      timestamp: item.timestamp,
      status: item.status === 'sending' ? 'error' : (item.status as Message['status']),
      ...(item.role === 'assistant' && item.details && isResponseDetails(item.details)
        ? { details: item.details }
        : {}),
    };
    bytes += new TextEncoder().encode(JSON.stringify(message)).length;
    if (bytes > MAX_HISTORY_BYTES) break;
    messages.unshift(message);
  }
  return { messages };
}
