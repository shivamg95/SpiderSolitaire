import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    // The e2e build only differs by exposing window.__spider (src/features/testing/bridge.ts).
    command: 'npm run build:e2e && npm run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Desktop WebKit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'iPad landscape',
      use: {
        ...devices['iPad (gen 7) landscape'],
        hasTouch: true,
      },
    },
    {
      name: 'iPad portrait',
      use: {
        ...devices['iPad (gen 7)'],
        hasTouch: true,
      },
    },
    {
      name: 'Galaxy Tab S4',
      use: {
        ...devices['Galaxy Tab S4'],
        hasTouch: true,
      },
    },
  ],
})
