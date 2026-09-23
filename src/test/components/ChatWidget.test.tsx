import React from 'react';
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
    expect(screen.queryByText(/soy tu asistente virtual/i)).not.toBeInTheDocument();
  });

  it('renderiza el contenido del widget si está abierto', () => {
    useChatStore.setState({ isOpen: true });
    render(<ChatWidget />);
    expect(screen.getByText(/soy tu asistente virtual/i)).toBeInTheDocument();
  });
});
