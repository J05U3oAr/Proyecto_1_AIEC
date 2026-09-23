import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '@/store/useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChatStore.setState({
      isOpen: false,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
  });

  it('agrega un mensaje de usuario pendiente y devuelve su identificador', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001');
    vi.spyOn(Date, 'now').mockReturnValue(1234);

    const messageId = useChatStore.getState().sendMessage('Hola Sofía');

    expect(messageId).toBe('00000000-0000-0000-0000-000000000001');
    expect(useChatStore.getState().messages).toEqual([
      {
        id: '00000000-0000-0000-0000-000000000001',
        role: 'user',
        content: 'Hola Sofía',
        timestamp: 1234,
        status: 'sending',
      },
    ]);
  });

  it('recibe la respuesta del asistente y finaliza el indicador de escritura', () => {
    useChatStore.setState({ isTyping: true });

    useChatStore.getState().receiveMessage('La respuesta es **42**.');

    expect(useChatStore.getState().messages[0]).toMatchObject({
      role: 'assistant',
      content: 'La respuesta es **42**.',
      status: 'sent',
    });
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('actualiza el estado de entrega o error del mensaje', () => {
    const messageId = useChatStore.getState().sendMessage('Mensaje');

    useChatStore.getState().markMessageAsSent(messageId);
    expect(useChatStore.getState().messages[0].status).toBe('sent');

    useChatStore.getState().markMessageAsError(messageId);
    expect(useChatStore.getState().messages[0].status).toBe('error');
  });

  it('limpia la conversación y el estado de escritura', () => {
    useChatStore.getState().sendMessage('Mensaje');
    useChatStore.setState({ isTyping: true });

    useChatStore.getState().clearChat();

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('persiste solamente la conversación en localStorage', () => {
    useChatStore.getState().sendMessage('Persistir este mensaje');

    expect(useChatStore.persist.getOptions().name).toBe('agichat-conversation');
    expect(localStorage.getItem('agichat-conversation')).toContain('Persistir este mensaje');
    expect(localStorage.getItem('agichat-conversation')).not.toContain('isTyping');
  });
});
