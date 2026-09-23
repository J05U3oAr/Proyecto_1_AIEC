import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoApp } from '@/demo/DemoApp';
import { resetMockScenario } from '@/mocks/demoScenario';
import { useChatStore } from '@/store/useChatStore';

const sendMessageMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/chatService', () => ({
  chatService: { sendMessage: sendMessageMock },
}));

describe('DemoApp', () => {
  beforeEach(() => {
    useChatStore.setState({
      isOpen: true,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
    resetMockScenario();
    sendMessageMock.mockResolvedValue({ response: 'Respuesta de demostración' });
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    resetMockScenario();
    vi.clearAllMocks();
  });

  it('muestra el portal y permite configurar el widget en vivo', () => {
    const { container } = render(<DemoApp />);

    expect(screen.getByRole('heading', { name: /interfaz agéntica lista/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del agente' }), {
      target: { value: 'Luna' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tema del widget' }), {
      target: { value: 'dark' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Posición del widget' }), {
      target: { value: 'top-left' },
    });

    expect(screen.getByText('¡Hola soy tu asistente virtual Luna!')).toBeInTheDocument();
    expect(container.querySelector('[data-agichat-widget]')).toHaveAttribute('data-theme', 'dark');
    expect(container.querySelector('[data-agichat-widget]')).toHaveAttribute(
      'data-position',
      'top-left'
    );
  });

  it('envía una prueba de tabla mediante el servicio del chat', async () => {
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /probar tabla/i }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('Muéstrame las métricas del piloto');
    });
    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: 'Muéstrame las métricas del piloto', status: 'sent' },
      { role: 'assistant', content: 'Respuesta de demostración', status: 'sent' },
    ]);
    expect(screen.getByText('API: table')).toBeInTheDocument();
  });

  it('envía una prueba de código mediante el servicio del chat', async () => {
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /probar código/i }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('Muéstrame un ejemplo de integración');
    });
    expect(screen.getByText('API: code')).toBeInTheDocument();
  });

  it('muestra el mensaje fallido cuando se simula una caída de red', async () => {
    sendMessageMock.mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /simular caída/i }));

    await waitFor(() => {
      expect(useChatStore.getState().messages).toMatchObject([{ role: 'user', status: 'error' }]);
    });
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo enviar');
    expect(screen.getByText('API: error')).toBeInTheDocument();
  });

  it('limpia los mensajes y restablece el escenario normal', async () => {
    render(<DemoApp />);
    fireEvent.click(screen.getByRole('button', { name: /probar tabla/i }));

    await waitFor(() => {
      expect(useChatStore.getState().messages).toHaveLength(2);
    });
    fireEvent.click(screen.getByRole('button', { name: /limpiar demostración/i }));

    expect(useChatStore.getState().messages).toEqual([]);
    expect(screen.getByText('API: normal')).toBeInTheDocument();
  });
});
