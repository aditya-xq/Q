import { expect, test, chromium } from '@playwright/test'
import path from 'node:path'

/**
 * MV3 extension smoke test.
 *
 * Extensions require a persistent, headed Chromium context, so it is opt-in:
 *   bun run test:e2e:extension
 */
test.describe('Chrome extension (MV3)', () => {
    test.skip(process.env.RUN_EXTENSION_E2E !== '1', 'Set RUN_EXTENSION_E2E=1 to run extension tests')

    test('new tab override renders Q', async () => {
        const extensionPath = path.resolve('build-extension')
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
        })

        try {
            let [serviceWorker] = context.serviceWorkers()
            if (!serviceWorker) {
                serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 })
            }
            const extensionId = new URL(serviceWorker.url()).host

            const page = await context.newPage()
            await page.goto(`chrome-extension://${extensionId}/index.html`)

            await expect(page.getByText('Queue', { exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Settings (Alt + S)' })).toBeVisible()
        } finally {
            await context.close()
        }
    })
})
