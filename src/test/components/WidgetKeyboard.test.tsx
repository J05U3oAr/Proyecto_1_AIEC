import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { useChatStore } from '@/store/useChatStore';

describe('nonmodal widget keyboard lifecycle', () => {
  beforeEach(() => {
    useChatStore.getState().clearChat();
    useChatStore.setState({ isOpen: false });
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });
  it('focuses the input on opening and returns to the launcher on Escape', async () => {
    render(<ChatWidget />);
    const launcher = screen.getByRole('button', { name: 'Abrir chat' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(launcher);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    const panel = screen.getByRole('region', { name: 'Chat de Sofía' });
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
    expect(launcher).toHaveAttribute('aria-controls', panel.id);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(useChatStore.getState().isOpen).toBe(false);
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Abrir chat' })).toHaveFocus();
  });
});
