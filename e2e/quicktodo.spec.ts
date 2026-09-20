import { expect, test, type Page } from '@playwright/test'
import { openViewShortcut } from './helpers'

async function addQuickTask(page: Page, text: string): Promise<void> {
    const input = page.getByPlaceholder('Add a task and press Enter...')
    await input.fill(text)
    await input.press('Enter')
    await expect(page.getByText(text, { exact: true })).toBeVisible()
}

test.describe('Quick Todo', () => {
    test('add, complete and delete a quick task', async ({ page }) => {
        await openViewShortcut(page, 'q')

        const input = page.getByPlaceholder('Add a task and press Enter...')
        await expect(input).toBeVisible()
        await addQuickTask(page, 'Buy milk')

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
        await addQuickTask(page, 'Persisted task')

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await page.waitForLoadState('networkidle')
        await page.keyboard.press('Alt+q')
        await expect(page.getByText('Persisted task')).toBeVisible()
    })

    test('ignores blank input', async ({ page }) => {
        await openViewShortcut(page, 'q')

        const input = page.getByPlaceholder('Add a task and press Enter...')
        await input.fill('   ')
        await input.press('Enter')

        await expect(page.getByText('No tasks yet. Add something above.')).toBeVisible()
    })

    test('trims surrounding whitespace', async ({ page }) => {
        await openViewShortcut(page, 'q')
        await addQuickTask(page, '   Trim me   ')
        await expect(page.getByText('Trim me', { exact: true })).toBeVisible()
    })

    test('toggles a completed task back to active', async ({ page }) => {
        await openViewShortcut(page, 'q')
        await addQuickTask(page, 'Flip flop')

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed')).toBeVisible()

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed')).toHaveCount(0)
        await expect(page.getByText('Flip flop')).toBeVisible()
    })

    test('lists newest incomplete tasks first', async ({ page }) => {
        await openViewShortcut(page, 'q')
        await addQuickTask(page, 'Older')
        await addQuickTask(page, 'Newer')

        await expect(page.locator('.task-item').nth(0)).toContainText('Newer')
        await expect(page.locator('.task-item').nth(1)).toContainText('Older')
    })
})
