import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.describe('Quick links', () => {
    test('renders the default quick links', async ({ page }) => {
        await openHome(page)
        const sidebar = page.locator('aside')
        for (const name of ['Gmail', 'WhatsApp', 'Netflix', 'ChatGPT', 'X', 'Techflix']) {
            await expect(sidebar.getByRole('button', { name, exact: true })).toBeVisible()
        }
    })

    test('loads an icon for every quick link', async ({ page }) => {
        await openHome(page)
        const icons = page.locator('aside img')
        await expect(icons).toHaveCount(6)
        await expect(icons.first()).toHaveAttribute('src', '/icons/brands/gmail.ico')

        // Bundled marks must resolve; a failing custom link falls back to the local placeholder.
        await expect
            .poll(() => icons.evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)), {
                timeout: 15_000,
            })
            .toBe(true)
    })

    test('falls back to the bundled placeholder when a remote favicon fails', async ({ page }) => {
        await page.route('https://www.google.com/s2/favicons**', (route) => route.abort())
        await openHome(page)
        // Techflix is a custom link, so its icon comes from the favicon proxy.
        await expect(page.locator('aside img').nth(5)).toHaveAttribute('src', '/icons/brands/link.svg')
    })

    test('sidebar reflects a link saved from settings without a reload', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()

        const panel = page.locator('[data-settings-panel]')
        await panel.getByRole('button', { name: 'Other' }).first().click()
        await panel.getByPlaceholder('https://example.com').first().fill('example.org')
        await expect(page.getByText('Saved')).toBeVisible()

        await page.getByRole('button', { name: 'Close settings' }).click()
        await expect(page.locator('aside').getByRole('button', { name: 'Example' })).toBeVisible()
    })

    test('updates the sidebar when switching back to a predefined app', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()

        const panel = page.locator('[data-settings-panel]')
        await panel.getByRole('button', { name: 'Other' }).first().click()
        await panel.getByPlaceholder('https://example.com').first().fill('example.org')
        await expect(page.getByText('Saved')).toBeVisible()

        await panel.getByRole('button', { name: 'Gmail' }).click()
        await expect(page.locator('aside').getByRole('button', { name: 'Gmail' })).toBeVisible()
    })
})
