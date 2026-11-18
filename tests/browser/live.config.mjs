import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/liveIntegration.playwright.mjs',
  timeout: 90000,
  expect: { timeout: 60000 },
  workers: 1,
  retries: 0,
  outputDir: '../../test-results/browser-live',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4318',
    viewport: { width: 320, height: 740 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    launchOptions: { ignoreDefaultArgs: ['--disable-popup-blocking'] },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4318 --strictPort --open false',
    url: 'http://127.0.0.1:4318',
    env: { VITE_CHAT_MODE: 'real' },
    reuseExistingServer: false,
    timeout: 45000,
  },
});
