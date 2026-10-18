import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/api-auth.spec.ts',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'on-first-retry' },
  webServer: [
    { command: 'npm run server:start', url: 'http://127.0.0.1:4000/api/health', reuseExistingServer: true },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: true, env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:4000' } },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
