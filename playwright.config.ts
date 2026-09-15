import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const WEB_BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`
const LIVE_BASE_URL = process.env.LIVE_BASE_URL ?? 'https://q.xqbuilds.com'
const isLiveRun = process.env.E2E_LIVE === '1'
const noServer = isLiveRun || process.env.E2E_NO_SERVER === '1'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
    timeout: 30_000,
    expect: { timeout: 10_000 },
    use: {
        baseURL: WEB_BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // The PWA service worker can serve stale assets during tests.
        serviceWorkers: 'block',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: [/extension\.spec\.ts/, /live\.spec\.ts/],
        },
        {
            name: 'extension',
            testMatch: /extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'live',
            testMatch: /live\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], baseURL: LIVE_BASE_URL },
        },
    ],
    webServer: noServer
        ? undefined
        : {
              command: 'bun run build:web && bunx vite preview --port 4173 --strictPort',
              url: WEB_BASE_URL,
              reuseExistingServer: !process.env.CI,
              timeout: 180_000,
          },
})
