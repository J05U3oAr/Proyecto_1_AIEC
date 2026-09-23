import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { FloatingLauncher } from '../../components/widget/FloatingLauncher';
import { useChatStore } from '../../store/useChatStore';

describe('FloatingLauncher', () => {
  beforeEach(() => {
    // Reset state
    useChatStore.setState({ isOpen: false, messages: [], isTyping: false });
  });

  it('renderiza correctamente el botón flotante cerrado', () => {
    render(<FloatingLauncher />);
    const button = screen.getByRole('button', { name: /Abrir chat/i });
    expect(button).toBeInTheDocument();
  });

  it('cambia el estado del chat al hacer clic y cambia el label', () => {
    render(<FloatingLauncher />);
    const button = screen.getByRole('button', { name: /Abrir chat/i });

    expect(useChatStore.getState().isOpen).toBe(false);
    fireEvent.click(button);
    expect(useChatStore.getState().isOpen).toBe(true);

    // Al estar abierto debe cambiar a Cerrar chat
    expect(screen.getByRole('button', { name: /Cerrar chat/i })).toBeInTheDocument();
  });
});
