import { expect, test } from '@playwright/test'
import { openViewShortcut } from './helpers'

test.describe('Quick Todo', () => {
    test('add, complete and delete a quick task', async ({ page }) => {
        await openViewShortcut(page, 'q')

        const input = page.getByPlaceholder('Add a task and press Enter...')
        await expect(input).toBeVisible()
        await input.fill('Buy milk')
        await input.press('Enter')

        await expect(page.getByText('Buy milk')).toBeVisible()

        // Mark complete by clicking the visual checkbox label.
        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed')).toBeVisible()

        // Delete the task.
        await page.getByText('Buy milk').first().hover()
        await page.getByRole('button', { name: 'Delete task' }).first().click()
        await expect(page.getByText('Buy milk')).toHaveCount(0)
    })

    test('persists tasks across a reload', async ({ page }) => {
        await openViewShortcut(page, 'q')
        const input = page.getByPlaceholder('Add a task and press Enter...')
        await input.fill('Persisted task')
        await input.press('Enter')
        await expect(page.getByText('Persisted task')).toBeVisible()

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await page.keyboard.press('Alt+q')
        await expect(page.getByText('Persisted task')).toBeVisible()
    })
})
