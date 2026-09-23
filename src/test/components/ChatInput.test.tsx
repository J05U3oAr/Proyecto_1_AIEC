import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatInput } from '../../components/widget/ChatInput';
import { useChatStore } from '../../store/useChatStore';

describe('ChatInput', () => {
  beforeEach(() => {
    useChatStore.setState({ isOpen: true, messages: [], isTyping: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('escribe en el campo de texto', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    fireEvent.change(input, { target: { value: 'Prueba' } });
    expect(input).toHaveValue('Prueba');
  });

  it('envía mensaje al hacer clic en el botón', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    const btn = screen.getByRole('button', { name: /Enviar mensaje/i });
    
    fireEvent.change(input, { target: { value: 'Mensaje prueba' } });
    fireEvent.click(btn);
    
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('Mensaje prueba');
    expect(input).toHaveValue('');
  });

  it('envía mensaje al presionar Enter sin Shift', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    
    fireEvent.change(input, { target: { value: 'Mensaje con Enter' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });
    
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('Mensaje con Enter');
  });

  it('no envía mensaje si está vacío o solo tiene espacios', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    const btn = screen.getByRole('button', { name: /Enviar mensaje/i });
    
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(btn);
    
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('simula respuesta del agente y manipula isTyping', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    const btn = screen.getByRole('button', { name: /Enviar mensaje/i });
    
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.click(btn);
    
    // Inmediatamente después de enviar, el usuario tiene su mensaje y el agente escribe
    expect(useChatStore.getState().isTyping).toBe(true);
    
    // Avanzar 2000ms en el tiempo para disparar el setTimeout de la respuesta simulada
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    expect(useChatStore.getState().isTyping).toBe(false);
    expect(useChatStore.getState().messages).toHaveLength(2); // Usuario + Asistente
    expect(useChatStore.getState().messages[1].role).toBe('assistant');
  });

  it('no envía mensaje al presionar Shift+Enter', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    
    fireEvent.change(input, { target: { value: 'Salto de linea' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('no envía mensaje si se presiona otra tecla', () => {
    render(<ChatInput />);
    const input = screen.getByRole('textbox', { name: /Campo de texto para mensaje/i });
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'A', code: 'KeyA', shiftKey: false });
    expect(useChatStore.getState().messages).toHaveLength(0);
  });
});
