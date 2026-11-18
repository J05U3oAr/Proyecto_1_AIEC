import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationStatus } from '@/components/widget/NavigationStatus';
import { ChatInput } from '@/components/widget/ChatInput';
import { useChatStore } from '@/store/useChatStore';
import { ChatServiceContext } from '@/services/ChatServiceContext';
import { navigationFixture } from '@/mocks/cinemaFixtures';

describe('accessible reference feedback', () => {
  beforeEach(() => useChatStore.getState().clearChat());
  afterEach(() => vi.restoreAllMocks());
  it('has no restored notice and only displays safe explicit fallback links', () => {
    const { rerender } = render(<NavigationStatus />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() =>
      useChatStore.getState().setNavigationNotice({
        status: 'blocked',
        message: 'Popup blocked',
        fallback: {
          provider: 'imdb',
          url: 'https://www.imdb.com/title/tt0083658/',
          label: 'Abrir IMDb',
        },
      })
    );
    expect(screen.getByRole('status')).toHaveTextContent('Popup blocked');
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    act(() =>
      useChatStore.getState().setNavigationNotice({
        status: 'blocked',
        message: 'Invalid',
        fallback: { provider: 'imdb', url: 'javascript:alert(1)', label: 'Unsafe' },
      })
    );
    rerender(<NavigationStatus />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('announces a pending tab before submit and exposes popup blocking without marking the send failed', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <ChatServiceContext.Provider
        value={{
          sendMessage: async (_prompt, options) =>
            navigationFixture({ provider: 'google_books' }, options!.requestId),
        }}
      >
        <ChatInput />
      </ChatServiceContext.Provider>
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Abre Google Books' } });
    const hint = screen.getByText(/Al enviar se intentará reservar/);
    expect(input).toHaveAttribute('aria-describedby', hint.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No pude usar la pestaña')
    );
    expect(screen.getByRole('link')).toHaveAccessibleName(/Abrir libro en Google Books/);
    expect(useChatStore.getState().messages[0].status).toBe('sent');
    expect(open).toHaveBeenCalledOnce();
  });
});
