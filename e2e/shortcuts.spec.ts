import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

const STUB_SITES = new Set(['mail.google.com', 'outlook.live.com', 'techflix.club'])

async function openHomeWithLinks(page: Page): Promise<void> {
    await page.route(
        (url) => STUB_SITES.has(url.hostname),
        (route) =>
            route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: '<!doctype html><title>Stub</title><h1>Stub</h1>',
            })
    )
    await openHome(page)
    // The rail and the mobile menu render from the same state the shortcuts read,
    // so their arrival means the shortcuts are armed.
    await expect(page.locator('img[alt="Gmail"]').first()).toBeAttached()
}

test.describe('Quick link shortcuts', () => {
    test('opens the configured email with E', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('e')
        await expect(page).toHaveURL(/^https:\/\/mail\.google\.com/)
    })

    test('opens the configured custom link with C', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('c')
        await expect(page).toHaveURL(/^https:\/\/techflix\.club/)
    })

    test('opens the link configured in settings', async ({ page }) => {
        await openHomeWithLinks(page)

        await page.keyboard.press('Alt+s')
        const panel = page.locator('[data-settings-panel]')
        await panel.getByRole('button', { name: 'Outlook' }).click()
        await expect(page.getByText('Saved')).toBeVisible()
        await page.getByRole('button', { name: 'Close settings' }).click()

        await expect(page.locator('aside').getByRole('button', { name: 'Outlook' })).toBeVisible()
        await page.keyboard.press('e')
        await expect(page).toHaveURL(/^https:\/\/outlook\.live\.com/)
    })

    test('ignores the letters while typing', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+p')
        await page.getByRole('button', { name: 'New Project' }).click()

        const input = page.getByPlaceholder('Project name')
        await input.click()
        await page.keyboard.type('em')
        await expect(input).toHaveValue('em')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('ignores modifier combos', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+e')
        await page.keyboard.press('Control+e')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while settings owns the keyboard', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+s')
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

        await page.keyboard.press('e')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('ignores the letters inside the writer editor', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+w')

        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible()
        await editor.click()
        await page.keyboard.type('email')

        await expect(editor).toContainText('email')
        await expect(page).toHaveURL(/localhost:4173/)
    })
})

test.describe('Quick link shortcuts on mobile', () => {
    test.use({ viewport: { width: 390, height: 780 } })

    test('does nothing while the quick links menu is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.getByRole('button', { name: 'Toggle quick links' }).click()
        await page.keyboard.press('e')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while the projects drawer is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+p')
        await page.getByRole('button', { name: 'Open projects' }).click()
        await expect(page.getByRole('button', { name: 'New Project' })).toBeInViewport()

        await page.keyboard.press('e')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while the mobile nav menu is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.getByRole('button', { name: 'Toggle Menu' }).click()
        await expect(page.getByRole('button', { name: 'Home' })).toBeInViewport()

        await page.keyboard.press('e')
        await expect(page).toHaveURL(/localhost:4173/)
    })
})
