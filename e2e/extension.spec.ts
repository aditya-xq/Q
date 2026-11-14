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
            const page = await context.newPage()
            const cspErrors: string[] = []
            page.on('console', (message) => {
                if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
                    cspErrors.push(message.text())
                }
            })

            // The new-tab override is the most direct proof that the MV3 page loads;
            // it also gives us the extension id without relying on a service worker.
            await page.goto('chrome://newtab')
            expect(page.url()).toMatch(/^chrome-extension:\/\//)

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

            // GIFT Nifty comes from TradingView's scanner, which needs its own CSP entry.
            await page.route('https://scanner.tradingview.com/**', (route) =>
                route.fulfill({
                    json: {
                        totalCount: 1,
                        data: [
                            {
                                s: 'NSEIX:NIFTY1!',
                                d: [
                                    25205,
                                    -0.48,
                                    -123.5,
                                    25472.5,
                                    25156.5,
                                    'USD',
                                    'GIFT NIFTY 50 INDEX FUTURES',
                                    'streaming',
                                ],
                            },
                        ],
                    },
                })
            )
            const scan = await page.evaluate(async () => {
                try {
                    const response = await fetch('https://scanner.tradingview.com/global/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            symbols: { tickers: ['NSEIX:NIFTY1!'], query: { types: [] } },
                            columns: ['close'],
                        }),
                    })
                    const body = await response.json()
                    return { ok: response.ok, last: body.data[0].d[0] }
                } catch (error) {
                    return { error: String(error) }
                }
            })
            expect(scan).toEqual({ ok: true, last: 25205 })

            expect(cspErrors).toEqual([])
        } finally {
            await context.close()
        }
    })
})
