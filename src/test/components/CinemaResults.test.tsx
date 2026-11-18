import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovieCard } from '@/components/widget/results/MovieCard';
import { ComparisonCard } from '@/components/widget/results/ComparisonCard';
import { MessageBubble } from '@/components/widget/MessageBubble';
import { MessageResults } from '@/components/widget/results/MessageResults';
import { SourceLink, ResultSources } from '@/components/widget/results/ResultSources';
import { cinemaFixture, type CinemaScenario } from '@/mocks/cinemaFixtures';
import { responseDetails } from '@/services/responseValidation';
import type { Movie } from '@/services/contracts.generated';
import { AGIChatWidget } from '@/sdk';
import { useChatStore } from '@/store/useChatStore';

const movie: Movie = {
  id: 78,
  title: 'Blade Runner',
  year: 1982,
  tmdb: 'https://www.themoviedb.org/movie/78',
  imdb: 'https://www.imdb.com/title/tt0083658/',
  poster: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  genres: ['Ciencia ficción'],
  runtime: 117,
  tmdbRating: 8.1,
  voteCount: 20,
  overview: 'Sinopsis de prueba',
};

describe('movie result', () => {
  it('shows catalog metadata, safe sources and reserves a poster ratio', () => {
    const { container } = render(<MovieCard movie={movie} />);
    expect(screen.getByRole('article', { name: 'Película: Blade Runner' })).toBeInTheDocument();
    expect(screen.getByText('1982 · 117 min')).toBeInTheDocument();
    expect(screen.getByText('Ciencia ficción')).toBeInTheDocument();
    expect(screen.getByText('Catálogo TMDB: 8.1/10 · 20 votos')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('.aspect-\\[2\\/3\\]')).toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName(/otra pestaña/);
    }
  });
  it('falls back after an image failure and tries a new safe URL when the result changes', () => {
    const { rerender } = render(<MovieCard movie={movie} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Póster no disponible')).toBeInTheDocument();
    rerender(<MovieCard movie={{ ...movie, poster: 'https://image.tmdb.org/t/p/w500/new.png' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('new.png'));
  });
  it('does not request unsafe or missing images or invent a rating or year', () => {
    render(
      <MovieCard
        movie={{
          id: 1,
          title: 'x',
          tmdb: 'javascript:alert(1)',
          poster: 'https://evil.test/image.jpg',
        }}
      />
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Año no disponible')).toBeInTheDocument();
    expect(screen.getByText('Referencia no disponible')).toBeInTheDocument();
    expect(screen.queryByText(/votos/)).not.toBeInTheDocument();
  });
  it('keeps the synopsis collapsed and keyboard focusable', async () => {
    const user = userEvent.setup();
    render(<MovieCard movie={movie} />);
    const summary = screen.getByText('Sinopsis (puede contener spoilers)');
    await user.tab();
    expect(summary).toHaveFocus();
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await user.click(summary);
    expect(screen.getByText('Sinopsis de prueba')).toBeVisible();
    await user.click(summary);
    expect(summary.closest('details')).not.toHaveAttribute('open');
  });
});

describe('comparison and attribution', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each<CinemaScenario>(['comparison', 'uncertain', 'partial', 'not_found'])(
    'renders %s without provider calls or navigation',
    scenario => {
      const response = cinemaFixture(scenario);
      const open = vi.spyOn(window, 'open');
      const fetch = vi.spyOn(globalThis, 'fetch');
      render(
        <MessageBubble
          message={{
            id: 'm',
            role: 'assistant',
            status: 'sent',
            timestamp: 1,
            content: response.response,
            details: responseDetails(response),
          }}
        />
      );
      const comparison = screen.getByRole('region', { name: 'Comparación con el libro' });
      expect(comparison).toBeInTheDocument();
      expect(screen.getByText('Recomendación y valoración de Sofía · IA')).toBeInTheDocument();
      if (response.comparison?.adaptation.book) {
        expect(
          within(comparison).getByRole('link', { name: /Ver libro en Google Books/ })
        ).toHaveAttribute('href', response.comparison.adaptation.book.url);
        expect(within(comparison).getAllByAltText('Powered by Google').length).toBeGreaterThan(0);
      }
      expect(open).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it('shows evidence on demand, its attribution and a separate subjective verdict', async () => {
    const comparison = cinemaFixture('comparison').comparison!;
    const user = userEvent.setup();
    render(
      <ComparisonCard
        comparison={{ ...comparison, verdict: 'Valoración distinta' }}
        responseText="Otra explicación"
        movieTitle="Blade Runner"
      />
    );
    expect(screen.getByText('Año de esta edición: 1996')).toBeInTheDocument();
    expect(screen.getByText('Adaptación confirmada por las fuentes')).toBeInTheDocument();
    expect(screen.getByText('Valoración distinta')).toBeInTheDocument();
    const summary = screen.getByText('Evidencia y detalles (pueden contener spoilers)');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await user.click(summary);
    const details = summary.closest('details')!;
    expect(within(details).getByAltText('Powered by Google')).toBeVisible();
    expect(within(details).getAllByRole('link')).toHaveLength(3);
  });
  it('does not repeat identical verdicts or claim that absence of evidence means no book exists', () => {
    const comparison = cinemaFixture('not_found').comparison!;
    render(<ComparisonCard comparison={comparison} responseText={comparison.verdict} />);
    expect(screen.getByText('Película de esta comparación')).toBeInTheDocument();
    expect(screen.getByText(/No confirma que el libro no exista/)).toBeInTheDocument();
    expect(screen.queryByText('Valoración de Sofía · opinión de IA')).not.toBeInTheDocument();
  });
  it('handles missing author/year, non-Google evidence and no optional details', () => {
    render(
      <ComparisonCard
        comparison={{
          adaptation: {
            movieId: 1,
            status: 'uncertain',
            book: { id: 'b', title: 'Book', url: 'https://books.google.com/books?id=b' },
            evidence: [
              {
                statement: '<script>unsafe</script>',
                source: {
                  provider: 'tmdb',
                  url: 'https://www.themoviedb.org/movie/1',
                  label: 'Film',
                },
              },
            ],
          },
          verdict: 'Opinion',
        }}
        responseText="Opinion"
      />
    );
    expect(screen.getByText('Autoría no disponible')).toBeInTheDocument();
    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('groups Google source attribution and blocks invalid links', () => {
    const { rerender } = render(<ResultSources sources={[]} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    rerender(
      <ResultSources
        sources={[
          { provider: 'google_books', label: 'Book', url: 'https://books.google.com/books?id=b' },
        ]}
      />
    );
    expect(screen.getByAltText('Powered by Google')).toBeVisible();
    expect(screen.getByRole('link')).toHaveAccessibleName(/Book · Google Books/);
    rerender(
      <SourceLink
        source={{
          provider: 'imdb',
          url: 'https://www.imdb.com.evil.test/title/tt1234567/',
          label: 'Unsafe',
        }}
      />
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('rejects invalid details before rendering any remote image', () => {
    render(
      <MessageResults
        details={{ movies: [{ ...movie, poster: 'https://evil.test/x.jpg' }] }}
        responseText="x"
      />
    );
    expect(screen.getByText('No pude mostrar las fichas de esta respuesta.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('does not render assistant result fields on a user message', () => {
    render(
      <MessageBubble
        message={{
          id: 'u',
          role: 'user',
          status: 'sent',
          timestamp: 1,
          content: 'User',
          details: { movies: [movie] },
        }}
      />
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('attributes book information also when supplied only as a source or evidence', () => {
    const source = {
      provider: 'google_books' as const,
      url: 'https://books.google.com/books?id=b',
      label: 'Book',
    };
    const message = {
      id: 'a',
      role: 'assistant' as const,
      status: 'sent' as const,
      timestamp: 1,
      content: 'Información bibliográfica',
    };
    const { rerender } = render(
      <MessageBubble message={{ ...message, details: { sources: [source] } }} />
    );
    expect(screen.getAllByAltText('Powered by Google')).toHaveLength(2);
    rerender(
      <MessageBubble
        message={{
          ...message,
          details: {
            comparison: {
              adaptation: {
                movieId: 1,
                status: 'uncertain',
                evidence: [{ statement: 'Evidencia incierta', source }],
              },
              verdict: message.content,
            },
          },
        }}
      />
    );
    expect(screen.getAllByAltText('Powered by Google')).toHaveLength(2);
    rerender(
      <MessageBubble
        message={{
          ...message,
          details: {
            sources: [
              { provider: 'tmdb', url: 'https://www.themoviedb.org/movie/1', label: 'Movie' },
            ],
          },
        }}
      />
    );
    expect(screen.queryByAltText('Powered by Google')).not.toBeInTheDocument();
  });
  it.each(['light', 'dark', { primary: '#123456', surface: '#ffffff', text: '#111111' }] as const)(
    'uses the host theme without recoloring provider graphics %#',
    theme => {
      window.HTMLElement.prototype.scrollTo = vi.fn();
      useChatStore.getState().clearChat();
      useChatStore
        .getState()
        .receiveMessage('Simulated result', responseDetails(cinemaFixture('comparison')));
      useChatStore.setState({ isOpen: true });
      const { container } = render(<AGIChatWidget theme={theme} />);
      expect(container.querySelector('[data-theme]')).toHaveAttribute(
        'data-theme',
        typeof theme === 'string' ? theme : 'custom'
      );
      expect(screen.getByRole('article')).toBeInTheDocument();
      for (const img of screen.getAllByAltText('Powered by Google'))
        expect(img).not.toHaveAttribute('style');
    }
  );
});
