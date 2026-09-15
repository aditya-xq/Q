import { expect, test } from '@playwright/test'
import { openViewShortcut, waitForAutosave } from './helpers'

test.describe('Writer', () => {
    test('writes, autosaves and lists the draft', async ({ page }) => {
        await openViewShortcut(page, 'w')

        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('Playwright draft')
        await waitForAutosave(page)

        // Creating a new draft keeps the previous one in the drafts panel.
        await page.getByRole('button', { name: 'Create new draft' }).first().click()
        await expect(page.getByText(/Playwright/).first()).toBeVisible()
    })

    test('creates a fresh draft with an empty heading', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('First')
        await waitForAutosave(page)

        await page.getByRole('button', { name: 'Create new draft' }).first().click()
        await expect(editor.locator('h1')).toHaveText('')
    })

    test('reopens a saved draft with its content', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('Alpha note')
        await waitForAutosave(page)

        await page.getByRole('button', { name: 'Create new draft' }).first().click()
        await editor.click()
        await page.keyboard.type('Beta note')
        await waitForAutosave(page)

        await page.getByText('Alpha note').first().click()
        await expect(editor).toContainText('Alpha note')
    })
})
