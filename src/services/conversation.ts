import type { IChatService } from '@/services/types';
import { publicFailure } from '@/services/chatErrors';
import { responseDetails } from '@/services/responseValidation';
import { useChatStore } from '@/store/useChatStore';

export type SendResult = 'sent' | 'failed' | 'ignored';

/** One send path for input, examples and SDK. Never retries or executes response actions. */
export async function submitChatMessage(
  prompt: string,
  service: IChatService
): Promise<SendResult> {
  const content = prompt.trim();
  const state = useChatStore.getState();
  if (!content || state.isTyping) return 'ignored';
  if ([...content].length > 4000) {
    state.setError({
      code: 'invalid_request',
      message: 'El mensaje no puede superar los 4000 caracteres.',
    });
    return 'ignored';
  }
  const version = state.conversationVersion;
  const id = state.sendMessage(content);
  state.setError(null);
  state.setTyping(true);
  const isCurrent = () => {
    const current = useChatStore.getState();
    return (
      current.conversationVersion === version &&
      current.messages.some(message => message.id === id && message.status === 'sending')
    );
  };
  try {
    const response = await service.sendMessage(content);
    if (!isCurrent()) return 'ignored';
    const current = useChatStore.getState();
    current.markMessageAsSent(id);
    current.receiveMessage(response.response, responseDetails(response));
    return 'sent';
  } catch (error) {
    if (!isCurrent()) return 'ignored';
    const current = useChatStore.getState();
    current.markMessageAsError(id);
    current.setError(publicFailure(error));
    return 'failed';
  }
}

export function resetConversation(service: IChatService): void {
  const cleanup = service.clearSession?.();
  useChatStore.getState().clearChat();
  const version = useChatStore.getState().conversationVersion;
  void cleanup?.catch(() => {
    const state = useChatStore.getState();
    if (state.conversationVersion === version && state.messages.length === 0) {
      state.receiveMessage(
        'Se limpió el historial local, pero no pude borrar la sesión del servidor. Expirará automáticamente.'
      );
    }
  });
}
