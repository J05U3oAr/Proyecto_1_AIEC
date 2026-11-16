import { describe, expect, it } from 'vitest';
import { shouldEnableMocking } from '@/services/runtimeMode';

describe('runtime mode', () => {
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
