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
