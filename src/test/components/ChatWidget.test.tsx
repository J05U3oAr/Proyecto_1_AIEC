import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatWidget } from '../../components/widget/ChatWidget';
import { useChatStore } from '../../store/useChatStore';

describe('ChatWidget', () => {
  beforeEach(() => {
    useChatStore.setState({ isOpen: false });
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('no renderiza el contenido del widget si está cerrado', () => {
    render(<ChatWidget />);
    expect(screen.queryByRole('region', { name: 'Chat de Sofía' })).not.toBeInTheDocument();
  });

  it('renderiza el contenido del widget si está abierto', () => {
    useChatStore.setState({ isOpen: true });
    render(<ChatWidget />);
    expect(screen.getByRole('region', { name: 'Chat de Sofía' })).toBeInTheDocument();
  });

  it('renderiza clases de expansión cuando isExpanded es true', () => {
    useChatStore.setState({ isOpen: true, isExpanded: true });
    render(<ChatWidget />);
    // Verificar que el contenedor tenga la clase de ancho expandido
    expect(screen.getByRole('region', { name: 'Chat de Sofía' })).toHaveClass('w-[800px]');
  });
});
