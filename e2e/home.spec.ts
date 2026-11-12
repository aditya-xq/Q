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

    test('hides the quote immediately when disabled in settings', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
        await page.getByRole('button', { name: 'Toggle quote widget' }).click()
        await expect(page.locator('blockquote')).toHaveCount(0)
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
