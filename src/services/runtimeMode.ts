export type ChatMode = 'mock' | 'real';

/** Safe development default; production never starts a mock service worker. */
export function shouldEnableMocking(isDevelopment: boolean, mode?: string): boolean {
  if (mode !== undefined && mode !== 'mock' && mode !== 'real') {
    throw new Error('VITE_CHAT_MODE debe ser mock o real');
  }
  return isDevelopment && mode !== 'real';
}

export function currentChatMode(): ChatMode {
  const mode = import.meta.env.MODE === 'real' ? 'real' : import.meta.env.VITE_CHAT_MODE;
  return shouldEnableMocking(import.meta.env.DEV, mode) ? 'mock' : 'real';
}
