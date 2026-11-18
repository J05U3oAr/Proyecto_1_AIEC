import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/externalReferences.playwright.mjs',
  timeout: 45000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  outputDir: '../../test-results/browser-external',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4319',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    launchOptions: { ignoreDefaultArgs: ['--disable-popup-blocking'] },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4319 --strictPort --open false',
    url: 'http://127.0.0.1:4319',
    env: { VITE_CHAT_MODE: 'real' },
    reuseExistingServer: false,
    timeout: 45000,
  },
});
