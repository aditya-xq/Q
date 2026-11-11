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

    test('new tab override renders and hydrates under the MV3 CSP', async () => {
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
            const cspErrors: string[] = []
            page.on('console', (message) => {
                if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
                    cspErrors.push(message.text())
                }
            })

            await page.goto(`chrome-extension://${extensionId}/index.html`)

            await expect(page.getByText('Queue', { exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Settings (Alt + S)' })).toBeVisible()

            // The prerendered markup renders even when scripts are blocked, so assert hydration
            // by opening Settings (only works once SvelteKit has started).
            await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
            await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

            // The extension CSP must allow the weather APIs; a host mismatch blocks the request.
            await page.route('https://api-bdc.io/**', (route) => route.fulfill({ json: { city: 'Testville' } }))
            const geocode = await page.evaluate(async () => {
                try {
                    const response = await fetch(
                        'https://api-bdc.io/data/reverse-geocode-client?latitude=1&longitude=1'
                    )
                    return { ok: response.ok, city: (await response.json()).city }
                } catch (error) {
                    return { error: String(error) }
                }
            })
            expect(geocode).toEqual({ ok: true, city: 'Testville' })

            // The extension CSP must also allow the keyless market quote feed.
            await page.route('https://quote.cnbc.com/**', (route) =>
                route.fulfill({
                    json: {
                        FormattedQuoteResult: {
                            FormattedQuote: [{ symbol: '.SPX', code: 0, last: '7,000.00' }],
                        },
                    },
                })
            )
            const quote = await page.evaluate(async () => {
                try {
                    const response = await fetch(
                        'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=.SPX&output=json'
                    )
                    const body = await response.json()
                    return { ok: response.ok, last: body.FormattedQuoteResult.FormattedQuote[0].last }
                } catch (error) {
                    return { error: String(error) }
                }
            })
            expect(quote).toEqual({ ok: true, last: '7,000.00' })

            expect(cspErrors).toEqual([])
        } finally {
            await context.close()
        }
    })
})
