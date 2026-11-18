import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/reference.browser.mjs',
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  outputDir: '../../test-results/browser',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4317',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    // Preserve Chromium's popup protection; Playwright normally disables it.
    launchOptions: { ignoreDefaultArgs: ['--disable-popup-blocking'] },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4317 --strictPort --open false',
    url: 'http://127.0.0.1:4317',
    env: { VITE_CHAT_MODE: 'real' },
    reuseExistingServer: false,
    timeout: 45000,
  },
});
