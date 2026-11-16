/** Explicit development mode; production never starts a mock service worker. */
export function shouldEnableMocking(isDevelopment: boolean, mode?: string): boolean {
  if (mode !== undefined && mode !== 'mock' && mode !== 'real') {
    throw new Error('VITE_CHAT_MODE debe ser mock o real');
  }
  return isDevelopment && mode !== 'real';
}
