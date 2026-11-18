import { act, fireEvent, render, screen } from '@testing-library/react';
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
  it('permite leer arriba sin forzar scroll y ofrece ir a una respuesta nueva', () => {
    render(<MessageList />);
    const viewport = screen.getByRole('log');
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, value: 1200 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    fireEvent.scroll(viewport);
    const scroll = vi.mocked(window.HTMLElement.prototype.scrollTo);
    scroll.mockClear();
    act(() => useChatStore.getState().receiveMessage('Nueva respuesta'));
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva respuesta · ir al final' }));
    expect(scroll).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' });
    expect(
      screen.queryByRole('button', { name: 'Nueva respuesta · ir al final' })
    ).not.toBeInTheDocument();
    fireEvent.scroll(viewport);
    act(() => useChatStore.getState().receiveMessage('Otra'));
    viewport.scrollTop = 1000;
    fireEvent.scroll(viewport);
    expect(
      screen.queryByRole('button', { name: 'Nueva respuesta · ir al final' })
    ).not.toBeInTheDocument();
  });
  it('respeta reduced motion y muestra orientación inicial', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    render(<MessageList />);
    expect(screen.getByText(/¿Qué te gustaría ver/)).toBeInTheDocument();
    expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );
    const viewport = screen.getByRole('log');
    Object.defineProperties(viewport, {
      scrollHeight: { value: 1200 },
      clientHeight: { value: 200 },
      scrollTop: { value: 0 },
    });
    fireEvent.scroll(viewport);
    act(() => useChatStore.getState().receiveMessage('New'));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva respuesta · ir al final' }));
    expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({
      top: 1200,
      behavior: 'auto',
    });
    vi.unstubAllGlobals();
  });
});
