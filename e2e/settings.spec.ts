import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.describe('Settings', () => {
    test('toggles a widget and persists the choice', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()

        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

        const quoteToggle = page.getByRole('button', { name: 'Toggle quote widget' })
        await expect(quoteToggle).toHaveAttribute('aria-pressed', 'true')
        await quoteToggle.click()
        await expect(quoteToggle).toHaveAttribute('aria-pressed', 'false')

        await page.reload()
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
        await expect(page.getByRole('button', { name: 'Toggle quote widget' })).toHaveAttribute('aria-pressed', 'false')
    })

    test('saves a custom quick link', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()

        const customButtons = page.getByRole('button', { name: 'Other' })
        await customButtons.first().click()

        const urlInput = page.getByPlaceholder('https://example.com').first()
        await urlInput.fill('example.org')
        await expect(page.getByText('Saved')).toBeVisible()
    })
})
