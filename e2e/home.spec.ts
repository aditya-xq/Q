import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.describe('Home', () => {
    test('renders shell, quick links and frequent sites', async ({ page }) => {
        await openHome(page)

        await expect(page.getByRole('button', { name: 'Quick Todo (Alt + Q)' })).toBeVisible()
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
})
