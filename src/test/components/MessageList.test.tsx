import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageList } from '../../components/widget/MessageList';
import { useChatStore } from '../../store/useChatStore';

// Radix ScrollArea necesita ResizeObserver mockeado en jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('MessageList', () => {
  beforeEach(() => {
    useChatStore.setState({
      isOpen: true,
      messages: [],
      isTyping: false,
    });
    // Mockear scrollTo en HTMLDivElement para que no falle en tests
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('renderiza los mensajes correctamente', () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'Hola', timestamp: 1, status: 'sent' },
        { id: '2', role: 'assistant', content: 'Respuesta', timestamp: 2, status: 'sent' },
      ],
    });
    render(<MessageList />);

    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.getByText('Respuesta')).toBeInTheDocument();
  });

  it('muestra el indicador de tipeo cuando isTyping es true', () => {
    useChatStore.setState({ isTyping: true });
    render(<MessageList />);
    expect(screen.getByLabelText(/escribiendo/i)).toBeInTheDocument();
  });
});
