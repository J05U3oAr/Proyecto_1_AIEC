import type { NavigationIntent } from '@/services/contracts.generated';

/** Deliberately conservative, aligned with M1. Only the current user command is examined. */
export function navigationIntent(prompt: string): NavigationIntent | null {
  const text = prompt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (
    !/^(?:por favor[, ]+)?(?:abre|abrir|abreme|open)\b/.test(text) ||
    /[\r\n"'`<>«»“”‘’;:\\]/.test(prompt) ||
    /\b(?:no|nunca|not|never|si|if)\b/.test(text)
  )
    return null;
  const imdb = /\bimdb\b/.test(text);
  const books = /\bgoogle\s+books\b/.test(text);
  if (imdb === books) return null;
  return { provider: imdb ? 'imdb' : 'google_books' };
}
