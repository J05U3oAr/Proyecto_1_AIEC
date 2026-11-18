import type { IChatService } from '@/services/types';
import { publicFailure } from '@/services/chatErrors';
import { responseDetails } from '@/services/responseValidation';
import { useChatStore } from '@/store/useChatStore';
import { navigationIntent } from '@/services/navigationIntent';
import { referenceNavigator } from '@/services/referenceNavigation';

let pendingNavigation: { service: IChatService; cancel: () => void } | null = null;

export function cancelNavigationFor(service: IChatService): void {
  if (pendingNavigation?.service === service) pendingNavigation.cancel();
}

export type SendResult = 'sent' | 'failed' | 'ignored';

/** One send path. Only an explicit current command can reserve and navigate a tab. Never retries. */
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
  state.setNavigationNotice(null);
  state.setTyping(true);
  const isCurrent = () => {
    const current = useChatStore.getState();
    return (
      current.conversationVersion === version &&
      current.messages.some(message => message.id === id && message.status === 'sending')
    );
  };
  const intent = navigationIntent(prompt);
  const options = intent ? { requestId: crypto.randomUUID(), navigationIntent: intent } : undefined;
  // reserve() runs synchronously in the submit gesture, before the first await.
  const ticket = options
    ? referenceNavigator.reserve(options.requestId, options.navigationIntent, notice => {
        if (isCurrent()) useChatStore.getState().setNavigationNotice(notice);
      })
    : null;
  const pending = ticket ? { service, cancel: ticket.cancel } : null;
  if (pending) pendingNavigation = pending;
  const unsubscribe = ticket
    ? useChatStore.subscribe(() => {
        if (!isCurrent()) ticket.cancel();
      })
    : () => {};
  try {
    const response = options
      ? await service.sendMessage(content, options)
      : await service.sendMessage(content);
    if (!isCurrent()) return 'ignored';
    ticket?.finish(response);
    const current = useChatStore.getState();
    current.markMessageAsSent(id);
    current.receiveMessage(response.response, responseDetails(response));
    return 'sent';
  } catch (error) {
    ticket?.cancel();
    if (!isCurrent()) return 'ignored';
    const current = useChatStore.getState();
    current.markMessageAsError(id);
    current.setError(publicFailure(error));
    return 'failed';
  } finally {
    unsubscribe();
    ticket?.cancel();
    if (pendingNavigation === pending) pendingNavigation = null;
  }
}

export function resetConversation(service: IChatService): void {
  cancelNavigationFor(service);
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
