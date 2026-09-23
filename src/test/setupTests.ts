import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import { afterEach } from 'vitest';

Object.assign(globalThis, { ReadableStream, TransformStream, WritableStream });

// Automatically unmount and cleanup DOM after the test is finished.
afterEach(() => {
  cleanup();
});
