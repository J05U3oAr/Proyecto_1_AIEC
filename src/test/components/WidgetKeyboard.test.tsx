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
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    expect(screen.getByRole('region', { name: 'Chat de Sofía' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(useChatStore.getState().isOpen).toBe(false);
    expect(screen.getByRole('button', { name: 'Abrir chat' })).toHaveFocus();
  });
});
