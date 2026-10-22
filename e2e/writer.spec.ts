import { expect, test } from '@playwright/test'
import { openViewShortcut, waitForAutosave } from './helpers'

test.describe('Writer', () => {
    test.describe('copy markdown', () => {
        test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

        test('copies the current draft markdown and resets the button label', async ({ page }) => {
            await openViewShortcut(page, 'w')
            const editor = page.locator('.milkdown .ProseMirror')
            await expect(editor).toBeVisible({ timeout: 20_000 })

            await editor.click()
            await page.keyboard.type('Clipboard note')

            const copyButton = page.getByRole('button', { name: 'Copy markdown to clipboard' })
            await copyButton.click()

            await expect(copyButton.getByText('Copied', { exact: true })).toBeVisible()
            await expect(page.getByText('Markdown copied to clipboard')).toBeVisible()

            const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
            expect(clipboardText).toContain('Clipboard note')

            // The label flips back after the confirmation window.
            await expect(copyButton.getByText('Copy', { exact: true })).toBeVisible({ timeout: 5_000 })
        })
    })

    test('keeps editor text readable in light and dark mode', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const prose = page.locator('.milkdown .ProseMirror')
        await expect(prose).toBeVisible({ timeout: 20_000 })

        const brightness = () =>
            prose.evaluate((el) => {
                const channels = getComputedStyle(el).color.match(/\d+/g)?.map(Number) ?? []
                return channels.reduce((sum, value) => sum + value, 0) / channels.length
            })

        // The app defaults to Terminal dark; switch modes explicitly for each check.
        const dialog = page.getByRole('dialog', { name: 'Theme designer' })
        await page.keyboard.press('Alt+a')
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Light', exact: true }).click()
        await dialog.getByRole('button', { name: 'Close theme designer' }).click()
        expect(await brightness()).toBeLessThan(100)

        await page.keyboard.press('Alt+a')
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await dialog.getByRole('button', { name: 'Close theme designer' }).click()
        await expect.poll(brightness).toBeGreaterThan(150)
    })

    test('shows a live word count while typing', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('one two three four five')
        await expect(page.getByText(/5\s+words/)).toBeVisible()
    })

    test.describe('tablet layout', () => {
        test.use({ viewport: { width: 820, height: 900 } })

        test('keeps the editor wide and moves drafts into the drawer', async ({ page }) => {
            await openViewShortcut(page, 'w')
            const editor = page.locator('.milkdown .ProseMirror')
            await expect(editor).toBeVisible({ timeout: 20_000 })

            // The inline panel is only shown from lg up; below it the drawer takes over.
            const box = await editor.boundingBox()
            expect(box?.width ?? 0).toBeGreaterThan(480)

            const openButton = page.getByRole('button', { name: 'Open drafts' })
            await expect(openButton).toBeVisible()
            await openButton.click()
            await expect(page.getByText('No drafts yet').last()).toBeVisible()

            await page.getByRole('button', { name: 'Close drafts panel' }).last().click()
            await expect(page.getByText('No drafts yet').last()).toBeHidden()
        })
    })

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

    test('shows an empty drafts list before any typing', async ({ page }) => {
        await openViewShortcut(page, 'w')
        await expect(page.locator('.milkdown .ProseMirror')).toBeVisible({ timeout: 20_000 })

        await expect(page.getByText('No drafts yet')).toBeVisible()
    })

    test('updates an existing draft in place without duplicating it', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('Unique note')
        await waitForAutosave(page)

        await page.getByRole('button', { name: 'Create new draft' }).first().click()
        await page.getByRole('button', { name: /Unique note/ }).click()

        await editor.click()
        await page.keyboard.type(' extended')
        await waitForAutosave(page)

        await expect(page.getByRole('button', { name: /Unique note/ })).toHaveCount(1)
    })

    test('deletes a draft', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('Delete me')
        await waitForAutosave(page)

        await page.getByRole('button', { name: /Delete me/ }).hover()
        await page.getByRole('button', { name: 'Delete draft' }).first().click()
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click()

        await expect(page.getByText('Delete me')).toHaveCount(0)
    })

    test('cancels deleting a draft', async ({ page }) => {
        await openViewShortcut(page, 'w')
        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible({ timeout: 20_000 })

        await editor.click()
        await page.keyboard.type('Keep draft')
        await waitForAutosave(page)

        await page.getByRole('button', { name: /Keep draft/ }).hover()
        await page.getByRole('button', { name: 'Delete draft' }).first().click()
        await page.getByRole('button', { name: 'Cancel' }).click()

        await expect(page.getByText('Keep draft').first()).toBeVisible()
    })
})
