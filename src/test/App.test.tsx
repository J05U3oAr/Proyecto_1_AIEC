import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { ChatModeContext } from '@/services/ChatModeContext';

describe('App Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it('renders the terminal shell from the chat UI design', () => {
    render(<App />);

    expect(screen.getByText('AGI_OS v1.0.42 (tty1)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AGIChat' })).toBeInTheDocument();
  });
  it('only exposes simulation scenarios in explicit mock mode', () => {
    const { rerender } = render(
      <ChatModeContext.Provider value="real">
        <App />
      </ChatModeContext.Provider>
    );
    expect(
      screen.queryByRole('heading', { name: 'Escenarios de demostración' })
    ).not.toBeInTheDocument();
    rerender(
      <ChatModeContext.Provider value="mock">
        <App />
      </ChatModeContext.Provider>
    );
    expect(screen.getByRole('heading', { name: 'Escenarios de demostración' })).toBeVisible();
  });
});
