import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '@/App';

describe('App Component (Default Starter)', () => {
  it('renders basic scaffolding heading and subtitle', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /AGIChat SDK/i })).toBeInTheDocument();
    expect(screen.getByText(/Configuración Base/i)).toBeInTheDocument();
  });

  it('increments counter on button click', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /Contador: 0/i });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /Contador: 1/i })).toBeInTheDocument();
  });
});
