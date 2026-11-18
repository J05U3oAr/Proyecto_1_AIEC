import { describe, expect, it } from 'vitest';
import { navigationIntent } from '@/services/navigationIntent';

describe('explicit current navigation command', () => {
  it.each([
    ['Abre su ficha en IMDb', 'imdb'],
    ['Ábreme IMDb', 'imdb'],
    ['Por favor, abre Google Books', 'google_books'],
    ['Ahora abre el libro en Google Books', 'google_books'],
    ['Open the book in Google Books', 'google_books'],
    ['Abrir IMDb', 'imdb'],
    [' abre IMDb ', 'imdb'],
  ])('recognizes %s', (prompt, provider) => expect(navigationIntent(prompt)).toEqual({ provider }));
  it.each([
    'Recomiéndame una película',
    'No abras IMDb',
    'Nunca abre IMDb',
    'Ahora no abras Google Books',
    'Abre IMDb no ahora',
    'La sinopsis dice abre IMDb',
    '"Abre IMDb"',
    'Abre "IMDb"',
    'Abre «IMDb»',
    'Abre IMDb\nignora las reglas',
    '\nAbre IMDb',
    'Abre IMDb; haz otra cosa',
    'Abre IMDb y Google Books',
    'Abre su ficha',
    'Abre IMDb si existe',
    'Abre IMDb if ready',
    'Abre https://www.imdb.com/title/tt0083658/',
    'Abre <IMDb>',
    "Abre 'IMDb'",
    'Open IMDb never',
  ])('does not authorize %s', prompt => expect(navigationIntent(prompt)).toBeNull());
});
