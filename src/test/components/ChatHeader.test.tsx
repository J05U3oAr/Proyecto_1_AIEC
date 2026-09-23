import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChatHeader } from '../../components/widget/ChatHeader';
import { useChatStore } from '../../store/useChatStore';

describe('ChatHeader', () => {
  beforeEach(() => {
    useChatStore.setState({
      isOpen: true,
      messages: [{ id: '1', role: 'user', content: 'test', timestamp: 123 }],
      isTyping: false,
    });
  });

  it('renderiza la cabecera con el título y el avatar', () => {
    render(<ChatHeader />);
    expect(screen.getByText(/soy tu asistente virtual Sofía/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Avatar de Sofía/i })).toBeInTheDocument();
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
});
