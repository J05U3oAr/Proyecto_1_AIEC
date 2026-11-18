import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentChatMode, shouldEnableMocking } from '@/services/runtimeMode';

describe('runtime mode', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('identifies the configured development mode without starting or probing a backend', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_CHAT_MODE', 'mock');
    expect(currentChatMode()).toBe('mock');
    vi.stubEnv('VITE_CHAT_MODE', 'real');
    expect(currentChatMode()).toBe('real');
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CHAT_MODE', 'mock');
    expect(currentChatMode()).toBe('real');
  });
  it('preserves the development demo default', () => {
    expect(shouldEnableMocking(true)).toBe(true);
    expect(shouldEnableMocking(true, 'mock')).toBe(true);
  });
  it('does not intercept backend requests in real mode or production', () => {
    expect(shouldEnableMocking(true, 'real')).toBe(false);
    expect(shouldEnableMocking(false, 'mock')).toBe(false);
    expect(shouldEnableMocking(false)).toBe(false);
  });
  it('rejects unknown modes instead of silently simulating the backend', () => {
    expect(() => shouldEnableMocking(true, 'reel')).toThrow('VITE_CHAT_MODE');
  });
});
