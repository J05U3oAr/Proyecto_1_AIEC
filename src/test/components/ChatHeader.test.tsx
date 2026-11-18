import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatService } from '@/services/chatService';
import { ChatHeader } from '../../components/widget/ChatHeader';
import { useChatStore } from '../../store/useChatStore';

describe('ChatHeader', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    useChatStore.setState({
      isOpen: true,
      messages: [{ id: '1', role: 'user', content: 'test', timestamp: 123, status: 'sent' }],
      isTyping: false,
    });
  });

  it('renderiza la cabecera con el título y el avatar', () => {
    render(<ChatHeader />);
    expect(screen.getByRole('heading', { name: 'Sofía' })).toBeInTheDocument();
    expect(screen.getByText('Asistente de IA')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Avatar de Sofía/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Estado: En línea')).not.toBeInTheDocument();
  });

  it('minimiza el chat al hacer clic en el botón minimizar', () => {
    render(<ChatHeader />);
    const minBtn = screen.getByRole('button', { name: /Minimizar ventana/i });
    fireEvent.click(minBtn);
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('limpia el chat al hacer clic en el botón reiniciar', () => {
    render(<ChatHeader />);
    expect(useChatStore.getState().messages.length).toBe(1);

    const clearBtn = screen.getByRole('button', { name: /Reiniciar chat/i });
    fireEvent.click(clearBtn);
    expect(useChatStore.getState().messages.length).toBe(0);
  });

  it('expande el chat al hacer clic en el botón expandir', () => {
    render(<ChatHeader />);
    const expandBtn = screen.getByRole('button', { name: /Expandir chat/i });
    fireEvent.click(expandBtn);
    expect(useChatStore.getState().isExpanded).toBe(true);
  });

  it('no interrumpe un mensaje nuevo por un fallo tardío del borrado anterior', async () => {
    let failCleanup: (reason: Error) => void = () => {};
    vi.spyOn(chatService, 'clearSession').mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          failCleanup = reject;
        })
    );
    render(<ChatHeader />);
    fireEvent.click(screen.getByRole('button', { name: /reiniciar chat/i }));
    await act(async () => {
      useChatStore.getState().sendMessage('Cars');
      useChatStore.getState().setTyping(true);
      failCleanup(new Error('No disponible'));
      await Promise.resolve();
    });
    expect(useChatStore.getState().isTyping).toBe(true);
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('avisa si el borrado remoto falla sin restaurar la conversación anterior', async () => {
    vi.spyOn(chatService, 'clearSession').mockRejectedValue(new Error('No disponible'));
    render(<ChatHeader />);
    fireEvent.click(screen.getByRole('button', { name: /reiniciar chat/i }));
    await waitFor(() =>
      expect(useChatStore.getState().messages[0]?.content).toContain('no pude borrar la sesión')
    );
    expect(useChatStore.getState().session).toBeNull();
  });
});
