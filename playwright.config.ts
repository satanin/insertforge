import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173' },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'npm run build && npm run preview', port: 4173, timeout: 180_000 },
  testDir: 'e2e'
});
