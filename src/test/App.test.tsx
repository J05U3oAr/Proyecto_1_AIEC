import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

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
});
