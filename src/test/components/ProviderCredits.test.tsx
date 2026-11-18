import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProviderCredits } from '@/components/widget/ProviderCredits';
import { useChatStore } from '@/store/useChatStore';

describe('ProviderCredits', () => {
  it('mantiene el aviso requerido visible aunque los detalles estén cerrados', () => {
    render(<ProviderCredits />);
    expect(screen.getByRole('group', { name: 'Créditos y fuentes' })).toBeVisible();
    expect(
      screen.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')
    ).toBeVisible();
    expect(screen.getByText('Créditos y fuentes').closest('details')).not.toHaveAttribute('open');
  });

  it('permite consultar las fuentes sin enviar peticiones ni alterar el historial', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const messages = useChatStore.getState().messages;
    const user = userEvent.setup();
    render(<ProviderCredits />);
    const summary = screen.getByText('Créditos y fuentes');
    await user.tab();
    expect(summary).toHaveFocus();
    // JSDOM no implementa el comportamiento de Enter sobre <summary>.
    await user.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Películas · TMDB' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Libros · Google Books' })).toBeVisible();
    expect(screen.getByText(/No representan la opinión/)).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages).toBe(messages);
    fireEvent.click(summary);
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fetchSpy.mockRestore();
  });

  it('identifica los destinos externos y conserva los gráficos sin filtros de color', () => {
    render(<ProviderCredits />);
    fireEvent.click(screen.getByText('Créditos y fuentes'));
    const links = screen.getAllByRole('link');
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      'https://www.themoviedb.org',
      'https://books.google.com',
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName(/otra pestaña/);
    }
    expect(screen.getAllByRole('img')).toHaveLength(2);
    for (const img of screen.getAllByRole('img')) {
      expect(img).not.toHaveAttribute('style');
      expect(img).not.toHaveAttribute('class');
    }
  });
});
