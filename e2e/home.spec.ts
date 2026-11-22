import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.describe('Home', () => {
    test('renders shell, quick links and frequent sites', async ({ page }) => {
        await openHome(page)

        await expect(page.getByRole('button', { name: 'Gmail' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Settings (Alt + S)' })).toBeVisible()
        await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible()
    })

    test('hydrates without uncaught page errors', async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))

        await openHome(page)
        await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible()

        expect(errors).toEqual([])
    })

    test('shows the full fallback frequent sites list when topSites is unavailable', async ({ page }) => {
        await openHome(page)
        for (const name of ['GitHub', 'YouTube', 'X', 'LinkedIn', 'Reddit', 'ChatGPT', 'Medium', 'Netflix']) {
            await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
        }
    })

    test('renders a quote by default', async ({ page }) => {
        await openHome(page)
        await expect(page.locator('blockquote')).toHaveCount(1)
    })

    test('shows an attribution line', async ({ page }) => {
        await openHome(page)
        const cite = page.locator('blockquote cite')
        await expect(cite).toBeVisible()
        await expect(cite).toContainText('—')
        await expect(cite).toHaveText(/—\s+\S+/)
    })

    test('announces a new entry to assistive technology', async ({ page }) => {
        await openHome(page)
        await expect(page.locator('blockquote p')).toHaveAttribute('aria-live', 'polite')
    })

    test('cycles to a different entry without repeating', async ({ page }) => {
        await openHome(page)
        const text = page.locator('blockquote p')
        const first = await text.innerText()

        await page.getByRole('button', { name: 'Show another quote or fact' }).click()
        await expect.poll(() => text.innerText()).not.toBe(first)
    })

    test('keeps the current entry when switching views', async ({ page }) => {
        await openHome(page)
        const text = page.locator('blockquote p')
        const first = await text.innerText()

        await page.getByRole('button', { name: 'Show another quote or fact' }).click()
        await expect.poll(() => text.innerText()).not.toBe(first)
        const chosen = await text.innerText()

        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await page.getByRole('button', { name: 'Home' }).click()
        await expect(page.locator('blockquote p')).toHaveText(chosen)
    })

    test('hides the quote immediately when disabled in settings', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
        await page.getByRole('button', { name: 'Toggle quote widget' }).click()
        await expect(page.locator('blockquote')).toHaveCount(0)
    })
})

test.describe('Frequent sites tooltips', () => {
    const LONG_TITLE = 'An exceptionally long page title that is truncated in the tile label'

    /** Chrome-only topSites API: seed eight long-titled tiles so the outer columns are exercised. */
    async function seedTopSites(page: import('@playwright/test').Page): Promise<void> {
        await page.addInitScript((title: string) => {
            Object.defineProperty(window, 'chrome', {
                configurable: true,
                value: {
                    topSites: {
                        get: (callback: (sites: { url: string; title: string }[]) => void) =>
                            callback(
                                Array.from({ length: 8 }, (_, index) => ({
                                    url: `https://site-${index}.example.com/`,
                                    title,
                                }))
                            ),
                    },
                },
            })
        }, LONG_TITLE)
    }

    async function tooltipState(locator: import('@playwright/test').Locator) {
        return locator.evaluate((element) => {
            const style = getComputedStyle(element, '::before')
            return { opacity: style.opacity, visibility: style.visibility, content: style.content }
        })
    }

    test('reveals the full site title on hover', async ({ page }) => {
        await seedTopSites(page)
        await openHome(page)

        const link = page.getByRole('link', { name: new RegExp(LONG_TITLE) }).first()
        await expect(link).toBeVisible()
        // aria-label keeps the generated tooltip text out of the accessible name.
        await expect(link).toHaveAccessibleName(LONG_TITLE)
        expect((await tooltipState(link)).opacity).toBe('0')

        await link.hover()

        // The bubble fades in over 150ms.
        await expect.poll(async () => (await tooltipState(link)).opacity).toBe('1')
        const revealed = await tooltipState(link)
        expect(revealed.visibility).toBe('visible')
        expect(revealed.content).toContain(LONG_TITLE)
        // It sizes to its content and wraps at max-width, not at the tile width.
        const widths = await link.evaluate((element) => ({
            bubble: Number.parseFloat(getComputedStyle(element, '::before').width),
            tile: element.getBoundingClientRect().width,
        }))
        expect(widths.bubble).toBeGreaterThan(widths.tile * 2)
    })

    test('reveals the tooltip for keyboard focus', async ({ page }) => {
        await seedTopSites(page)
        await openHome(page)

        const link = page.getByRole('link', { name: new RegExp(LONG_TITLE) }).first()

        // Tab until the tile owns focus, so :focus-visible matches (not just :focus).
        const isFocused = () => link.evaluate((element) => element === document.activeElement)
        for (let step = 0; step < 30 && !(await isFocused()); step += 1) {
            await page.keyboard.press('Tab')
        }
        expect(await isFocused()).toBe(true)

        await expect.poll(async () => (await tooltipState(link)).opacity).toBe('1')
    })

    test('keeps a long tooltip inside the viewport at every layout width', async ({ page }) => {
        await seedTopSites(page)
        await openHome(page)

        const links = page.getByRole('link', { name: new RegExp(LONG_TITLE) })
        await expect(links).toHaveCount(8)

        for (const width of [320, 390, 768, 1024]) {
            await page.setViewportSize({ width, height: 720 })
            // Every column, so a centred bubble in an inner column is caught too.
            for (let index = 0; index < 8; index += 1) {
                await links.nth(index).hover()
                const overflow = await page.evaluate(() => ({
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                }))
                expect(
                    overflow.scrollWidth,
                    `horizontal overflow at ${width}px, tile ${index + 1}`
                ).toBeLessThanOrEqual(overflow.clientWidth)
            }
        }
    })
})

test.describe('Home mobile layout', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('centers the quote and top sites when both widgets are off', async ({ page }) => {
        await openHome(page)
        await page.waitForTimeout(300)

        const quote = await page.locator('blockquote').boundingBox()
        const sites = await page.getByTestId('frequent-sites').boundingBox()
        expect(quote).not.toBeNull()
        expect(sites).not.toBeNull()

        const contentCenter = (quote!.y + sites!.y + sites!.height) / 2
        expect(Math.abs(contentCenter - 844 / 2)).toBeLessThan(60)
        expect(quote!.y).toBeGreaterThan(80)
        expect(sites!.y + sites!.height).toBeLessThan(800)
    })
})
