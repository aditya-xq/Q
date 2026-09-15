import { expect, test } from '@playwright/test'
import { openHome, openViewShortcut } from './helpers'

test.describe('Navigation & deep links', () => {
    test('projects button syncs the URL deep link', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await expect(page).toHaveURL(/view=projects/)
        await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    })

    test('deep link opens the writer', async ({ page }) => {
        await page.goto('/?view=writer')
        await expect(page.locator('.milkdown .ProseMirror')).toBeVisible({ timeout: 20_000 })
    })

    test('deep link opens projects', async ({ page }) => {
        await page.goto('/?view=projects')
        await expect(page.getByText('Select a project to view tasks')).toBeVisible()
    })

    test('unknown view falls back to home', async ({ page }) => {
        await page.goto('/?view=does-not-exist')
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible()
    })

    test('Alt+Q opens the quick panel', async ({ page }) => {
        await openViewShortcut(page, 'q')
        await expect(page.getByPlaceholder('Add a task and press Enter...')).toBeVisible()
    })

    test('Alt+P keyboard shortcut opens projects', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+p')
        await expect(page).toHaveURL(/view=projects/)
    })
})
