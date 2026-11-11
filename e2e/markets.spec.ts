import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

const QUOTE_URL = 'https://quote.cnbc.com/**'

interface Fixture {
    last: string
    change: string
    pct: string
    low: string
    high: string
}

const FIXTURES: Record<string, Fixture> = {
    '.SPX': { last: '7,514.31', change: '-35.63', pct: '-0.47%', low: '7,490.65', high: '7,543.92' },
    '@SP.1': { last: '7,551.25', change: '-24.00', pct: '-0.32%', low: '7,500.00', high: '7,600.00' },
    '@CL.1': { last: '85.54', change: '-1.31', pct: '-1.51%', low: '83.88', high: '86.93' },
    '@LCO.1': { last: '90.61', change: '+0.20', pct: '+0.22%', low: '89.80', high: '91.10' },
    '@GC.1': { last: '4,057.30', change: '-57.20', pct: '-1.39%', low: '4,040.80', high: '4,156.20' },
    '.NSEI': { last: '25,044.65', change: '+58.25', pct: '+0.23%', low: '24,838.75', high: '25,084.05' },
    '.FTSE': { last: '10,791.62', change: '+8.75', pct: '+0.08%', low: '10,767.77', high: '10,868.51' },
    AAPL: { last: '346.93', change: '+2.14', pct: '+0.62%', low: '342.10', high: '349.22' },
    NVDA: { last: '171.48', change: '+1.02', pct: '+0.60%', low: '169.90', high: '173.05' },
}

function quotePayload(symbols: string[]) {
    return {
        FormattedQuoteResult: {
            FormattedQuote: symbols.map((symbol) => {
                const fixture = FIXTURES[symbol] ?? FIXTURES['.SPX']
                return {
                    symbol,
                    code: 0,
                    shortName: symbol,
                    name: symbol === 'AAPL' ? 'Apple Inc.' : symbol === 'NVDA' ? 'NVIDIA Corporation' : symbol,
                    last: fixture.last,
                    change: fixture.change,
                    change_pct: fixture.pct,
                    low: fixture.low,
                    high: fixture.high,
                    curmktstatus: 'REG_MKT',
                    last_timedate: '11:04 AM EST',
                    last_time: '2026-11-10T11:04:05.000-0500',
                    currencyCode: 'USD',
                    realTime: 'true',
                }
            }),
        },
    }
}

async function mockQuotes(page: Page): Promise<void> {
    await page.route(QUOTE_URL, (route) => {
        const url = new URL(route.request().url())
        const symbols = (url.searchParams.get('symbols') ?? '')
            .split('|')
            .filter((symbol) => symbol && symbol !== 'BOGUS')
        return route.fulfill({ json: quotePayload(symbols) })
    })
}

async function enableMarkets(page: Page): Promise<void> {
    await openHome(page)
    await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
    await page.getByRole('button', { name: 'Toggle markets widget' }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(board(page)).toBeVisible()
}

async function openMarketsConfig(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Customize markets' }).click()
    await expect(page.getByLabel('Region')).toBeVisible()
}

function board(page: Page) {
    return page.locator('section[aria-labelledby="markets-heading"]')
}

test.describe('Markets widget', () => {
    test.use({ timezoneId: 'America/New_York' })

    test('renders the regional index, futures, crude and gold once enabled', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)

        const markets = board(page)
        await expect(markets).toBeVisible()
        await expect(page.getByTestId('markets-region')).toHaveText('US')
        await expect(markets.getByRole('link', { name: /S&P 500 Index/ })).toContainText('7,514.31')
        await expect(markets.getByRole('link', { name: /S&P 500 E-mini Futures/ })).toContainText('7,551.25')
        await expect(markets.getByRole('link', { name: /WTI Crude Oil Futures/ })).toContainText('85.54')
        await expect(markets.getByRole('link', { name: /Gold Futures/ })).toContainText('4,057.30')
        await expect(markets.getByRole('link')).toHaveCount(4)
    })

    test('persists custom symbols across reloads', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)
        await openMarketsConfig(page)

        const symbols = page.getByLabel('Extra symbols')
        await symbols.fill('AAPL, NVDA')
        await expect(page.getByText('Saved')).toBeVisible()

        await expect(board(page).getByRole('link', { name: /Apple Inc\./ })).toBeVisible()
        await expect(board(page).getByRole('link', { name: /NVIDIA Corporation/ })).toBeVisible()

        const links = board(page).getByRole('link')
        await expect(links).toHaveCount(6)
        const tops = await links.evaluateAll((elements) =>
            elements.map((element) => Math.round(element.getBoundingClientRect().top))
        )
        expect(tops[4]).toBeGreaterThan(tops[2])

        await page.reload()
        await openHome(page)
        await expect(board(page).getByRole('link', { name: /Apple Inc\./ })).toBeVisible()

        await openMarketsConfig(page)
        await expect(page.getByLabel('Extra symbols')).toHaveValue('AAPL, NVDA')
    })

    test('reports symbols the feed could not resolve', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)
        await openMarketsConfig(page)

        await page.getByLabel('Extra symbols').fill('BOGUS')
        await expect(page.getByText('1 unavailable')).toBeVisible()
        await expect(page.locator('[aria-label="Unavailable: BOGUS"]')).toBeVisible()
    })

    test('shows an error and recovers after retry', async ({ page }) => {
        let attempts = 0
        await page.route(QUOTE_URL, (route) => {
            attempts += 1
            if (attempts === 1) return route.fulfill({ status: 503, body: 'down' })
            const url = new URL(route.request().url())
            const symbols = (url.searchParams.get('symbols') ?? '').split('|').filter(Boolean)
            return route.fulfill({ json: quotePayload(symbols) })
        })

        await enableMarkets(page)

        await expect(page.getByText('Market data is unavailable right now.')).toBeVisible()
        await page.getByRole('button', { name: 'Retry' }).click()
        await expect(board(page).getByRole('link', { name: /S&P 500 Index/ })).toBeVisible()
    })

    test('does not request quotes until the widget is enabled', async ({ page }) => {
        let requests = 0
        page.on('request', (request) => {
            if (request.url().includes('quote.cnbc.com')) requests += 1
        })

        await openHome(page)
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        expect(requests).toBe(0)
    })
})

test.describe('Markets widget region', () => {
    test.use({ timezoneId: 'Asia/Kolkata' })

    test('infers India from the device clock', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)

        const markets = board(page)
        await expect(page.getByTestId('markets-region')).toHaveText('India')
        await expect(markets.getByRole('link', { name: /Nifty 50 Index/ })).toContainText('25,044.65')
        await expect(markets.getByRole('link', { name: /Brent Crude Oil Futures/ })).toBeVisible()
    })

    test('honors a region override', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)
        await openMarketsConfig(page)

        await page.getByLabel('Region').selectOption('uk')

        const markets = board(page)
        await expect(page.getByTestId('markets-region')).toHaveText('UK')
        await expect(markets.getByRole('link', { name: /FTSE 100/ })).toContainText('10,791.62')
        await expect(markets.getByRole('link', { name: /Nifty 50 Index/ })).toHaveCount(0)
    })
})

test.describe('Markets widget mobile', () => {
    test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' })

    test('lays the board out in a 2×2 grid', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)
        await page.waitForTimeout(500)

        const links = board(page).getByRole('link')
        await expect(links).toHaveCount(4)
        const tops = await links.evaluateAll((elements) =>
            elements.map((element) => Math.round(element.getBoundingClientRect().top))
        )
        expect(tops[0]).toBe(tops[1])
        expect(tops[2]).toBe(tops[3])
        expect(tops[2]).toBeGreaterThan(tops[0])

        await page.locator('#main-content').evaluate((element) => {
            element.scrollTop = 0
        })
        const quoteTop = await page.locator('blockquote').evaluate((element) => element.getBoundingClientRect().top)
        expect(quoteTop).toBeGreaterThan(60)
    })
})

test.describe('Markets widget small mobile', () => {
    test.use({ viewport: { width: 320, height: 640 }, timezoneId: 'America/New_York' })

    test('fits a 320px viewport without horizontal overflow', async ({ page }) => {
        await mockQuotes(page)
        await enableMarkets(page)
        await page.waitForTimeout(500)

        const markets = board(page)
        const links = markets.getByRole('link')
        await expect(links).toHaveCount(4)
        expect(await markets.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

        const tops = await links.evaluateAll((elements) =>
            elements.map((element) => Math.round(element.getBoundingClientRect().top))
        )
        expect(tops[0]).toBe(tops[1])
        expect(tops[2]).toBe(tops[3])
        expect(tops[2]).toBeGreaterThan(tops[0])
    })
})

test.describe('Markets and Weather stacking', () => {
    test.use({
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: { latitude: 40.71, longitude: -74.01 },
    })

    test('takes the weather slot when weather is off, then sits below it', async ({ page }) => {
        await mockQuotes(page)
        await page.route('https://api-bdc.io/**', (route) =>
            route.fulfill({ json: { city: 'Testville', locality: 'Testville', countryName: 'Testland' } })
        )
        await page.route('https://api.open-meteo.com/**', (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 21, relative_humidity_2m: 50, weather_code: 1 } },
            })
        )
        await page.route('https://air-quality-api.open-meteo.com/**', (route) =>
            route.fulfill({ json: { current: { us_aqi: 30 } } })
        )

        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
        await page.getByRole('button', { name: 'Toggle markets widget' }).click()
        await page.getByRole('button', { name: 'Toggle weather widget' }).click()
        await page.getByRole('button', { name: 'Close settings' }).click()
        await expect(page.getByText('Testville').last()).toBeVisible()
        await page.waitForTimeout(500)

        const weatherBox = await page.getByTestId('weather-widget').boundingBox()
        const withWeather = await board(page).boundingBox()
        expect(weatherBox).not.toBeNull()
        expect(withWeather).not.toBeNull()
        expect(withWeather!.y).toBeGreaterThanOrEqual(weatherBox!.y + weatherBox!.height)

        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
        await page.getByRole('button', { name: 'Toggle weather widget' }).click()
        await page.getByRole('button', { name: 'Close settings' }).click()
        await page.waitForTimeout(500)

        const withoutWeather = await board(page).boundingBox()
        expect(withoutWeather).not.toBeNull()
        expect(withoutWeather!.y).toBeLessThan(40)
    })
})
