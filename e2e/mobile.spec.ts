import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test.describe('Mobile drawers', () => {
    test('projects drawer opens and closes', async ({ page }) => {
        await page.goto('/?view=projects')
        await page.waitForLoadState('networkidle')

        const openButton = page.getByRole('button', { name: 'Open projects' })
        await expect(openButton).toBeVisible()

        await openButton.click()
        await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible()

        await page.getByRole('button', { name: 'Close projects panel' }).last().click()
        await expect(page.getByRole('button', { name: 'New Project' })).toBeHidden()
    })

    test('quick todo menu opens the panel and closes back home', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        await page.getByRole('button', { name: 'Toggle Menu' }).click()
        await page.getByRole('button', { name: 'Quick Todo (Alt + Q)' }).click()

        const input = page.getByPlaceholder('Add a task and press Enter...')
        await expect(input).toBeVisible()

        await page.getByRole('button', { name: 'Close Panel' }).click()
        await expect(input).toBeHidden()
    })

    test('writer drafts drawer opens', async ({ page }) => {
        await page.goto('/?view=writer')
        await expect(page.locator('.milkdown .ProseMirror')).toBeVisible({ timeout: 20_000 })

        await page.getByRole('button', { name: 'Open drafts' }).click()
        await expect(page.getByText('No drafts yet').last()).toBeVisible()
    })
})
