import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScenarioButtons } from '@/components/widget/ScenarioButtons';
import { resetMockScenario } from '@/mocks/demoScenario';
import { useChatStore } from '@/store/useChatStore';

const sendMessageMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/chatService', () => ({
  chatService: { sendMessage: sendMessageMock },
}));

describe('ScenarioButtons', () => {
  beforeEach(() => {
    useChatStore.setState({
      isOpen: false,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
    sendMessageMock.mockResolvedValue({ response: 'Respuesta de prueba' });
    resetMockScenario();
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetMockScenario();
  });

  it('muestra los tres escenarios con estado listo', () => {
    render(<ScenarioButtons />);

    expect(
      screen.getByRole('heading', { name: /escenarios de demostración/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /probar tabla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /probar código/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simular caída/i })).toBeInTheDocument();
    expect(screen.getByText('[READY]')).toBeInTheDocument();
  });

  it('ejecuta el escenario de tabla y abre el chat', async () => {
    render(<ScenarioButtons />);

    fireEvent.click(screen.getByRole('button', { name: /probar tabla/i }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('Muéstrame las métricas del piloto');
    });
    expect(useChatStore.getState().isOpen).toBe(true);
    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: 'Muéstrame las métricas del piloto', status: 'sent' },
      { role: 'assistant', content: 'Respuesta de prueba', status: 'sent' },
    ]);
    expect(screen.getByText('[DONE]')).toBeInTheDocument();
  });

  it('marca el mensaje como fallido si el escenario devuelve un error', async () => {
    sendMessageMock.mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<ScenarioButtons />);

    fireEvent.click(screen.getByRole('button', { name: /simular caída/i }));

    await waitFor(() => {
      expect(useChatStore.getState().messages).toMatchObject([
        { role: 'user', content: 'Comprueba la disponibilidad del agente', status: 'error' },
      ]);
    });
  });
});
