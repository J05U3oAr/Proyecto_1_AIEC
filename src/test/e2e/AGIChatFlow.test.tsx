import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';

import { DemoApp } from '@/demo/DemoApp';
import { resetMockScenario, setMockScenario } from '@/mocks/demoScenario';
import { handlers } from '@/mocks/handlers';
import { useChatStore } from '@/store/useChatStore';

const server = setupServer(...handlers);

describe('flujo E2E del widget AGIChat', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

  beforeEach(() => {
    useChatStore.setState({
      isOpen: false,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
    setMockScenario('code');
    window.HTMLElement.prototype.scrollTo = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    resetMockScenario();
  });

  afterAll(() => server.close());

  it('abre, envía una pregunta, renderiza código Markdown, copia y limpia el chat', async () => {
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat' }));
    const prompt = 'Genera un ejemplo de código';
    const input = screen.getByRole('textbox', { name: /campo de texto/i });

    fireEvent.change(input, { target: { value: prompt } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText(prompt)).toBeInTheDocument();
    const copyButton = await screen.findByRole(
      'button',
      { name: 'Copiar código' },
      { timeout: 5_000 }
    );
    expect(screen.getByText('AGIChatWidget')).toBeInTheDocument();

    fireEvent.click(copyButton);
    expect(await screen.findByRole('button', { name: 'Código copiado' })).toBeInTheDocument();
    expect(useChatStore.getState().messages).toMatchObject([
      { role: 'user', content: prompt, status: 'sent' },
      { role: 'assistant', status: 'sent' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar chat' }));

    await waitFor(() => {
      expect(useChatStore.getState().messages).toEqual([]);
    });
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar código' })).not.toBeInTheDocument();
  });
});
