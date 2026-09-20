import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

async function openSettings(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test.describe('Settings', () => {
    test('toggles a widget and persists the choice', async ({ page }) => {
        await openHome(page)
        await openSettings(page)

        const quoteToggle = page.getByRole('button', { name: 'Toggle quote widget' })
        await expect(quoteToggle).toHaveAttribute('aria-pressed', 'true')
        await quoteToggle.click()
        await expect(quoteToggle).toHaveAttribute('aria-pressed', 'false')

        await page.reload()
        await openSettings(page)
        await expect(page.getByRole('button', { name: 'Toggle quote widget' })).toHaveAttribute('aria-pressed', 'false')
    })

    test('saves a custom quick link', async ({ page }) => {
        await openHome(page)
        await openSettings(page)

        const customButtons = page.getByRole('button', { name: 'Other' })
        await customButtons.first().click()

        const urlInput = page.getByPlaceholder('https://example.com').first()
        await urlInput.fill('example.org')
        await expect(page.getByText('Saved')).toBeVisible()
    })

    test('opens with the keyboard shortcut and closes when clicking outside', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+s')
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

        await page.getByText('Queue', { exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden()
    })

    test('persists a predefined quick link and updates the sidebar', async ({ page }) => {
        await openHome(page)
        await openSettings(page)

        await page.getByRole('button', { name: 'Outlook' }).click()
        await expect(page.getByText('Saved')).toBeVisible()
        await expect(page.locator('aside').getByRole('button', { name: 'Outlook' })).toBeVisible()

        await page.reload()
        await openSettings(page)
        await expect(page.locator('aside').getByRole('button', { name: 'Outlook' })).toBeVisible()
    })

    test('does not save a custom link with an empty url', async ({ page }) => {
        await openHome(page)
        await openSettings(page)

        await page.getByRole('button', { name: 'Other' }).first().click()
        await page.waitForTimeout(800)

        await expect(page.getByText('Saved')).toHaveCount(0)
    })
})
