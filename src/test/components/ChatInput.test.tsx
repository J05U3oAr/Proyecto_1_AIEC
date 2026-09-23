import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from '@/components/widget/ChatInput';
import { useChatStore } from '@/store/useChatStore';

const sendMessageMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/chatService', () => ({
  chatService: { sendMessage: sendMessageMock },
}));

describe('ChatInput', () => {
  beforeEach(() => {
    useChatStore.setState({ isOpen: true, messages: [], isTyping: false });
    sendMessageMock.mockResolvedValue({ response: 'Respuesta del agente' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('escribe en el campo de texto', () => {
    render(<ChatInput />);

    fireEvent.change(screen.getByRole('textbox', { name: /campo de texto/i }), {
      target: { value: 'Prueba' },
    });

    expect(screen.getByRole('textbox')).toHaveValue('Prueba');
  });

  it('envía el mensaje al servicio y agrega la respuesta del agente', async () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /campo de texto/i });
    fireEvent.change(input, { target: { value: 'Mensaje prueba' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    });

    expect(sendMessageMock).toHaveBeenCalledWith('Mensaje prueba');
    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: 'Mensaje prueba', status: 'sent' },
      { role: 'assistant', content: 'Respuesta del agente', status: 'sent' },
    ]);
    expect(input).toHaveValue('');
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('envía el mensaje al presionar Enter sin Shift', async () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /campo de texto/i });
    fireEvent.change(input, { target: { value: 'Mensaje con Enter' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });
    });

    expect(sendMessageMock).toHaveBeenCalledWith('Mensaje con Enter');
  });

  it('marca el mensaje como error si el servicio falla', async () => {
    sendMessageMock.mockRejectedValue(new Error('Sin conexión'));
    render(<ChatInput />);
    fireEvent.change(screen.getByRole('textbox', { name: /campo de texto/i }), {
      target: { value: 'Mensaje fallido' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    });

    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: 'Mensaje fallido', status: 'error' },
    ]);
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('no envía mensajes vacíos ni al presionar Shift+Enter', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /campo de texto/i });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    fireEvent.change(input, { target: { value: 'Salto de línea' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages).toEqual([]);
  });
});
