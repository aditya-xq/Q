import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

const STUB_SITES = new Set(['mail.google.com', 'outlook.live.com', 'techflix.club', 'trello.com'])

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
    test('opens the configured email with G', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('g')
        await expect(page).toHaveURL(/^https:\/\/mail\.google\.com/)
    })

    test('opens the configured custom link with T', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('t')
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
        await page.keyboard.press('o')
        await expect(page).toHaveURL(/^https:\/\/outlook\.live\.com/)
    })

    test('ignores the letters while typing', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+p')
        await page.getByRole('button', { name: 'New Project' }).click()

        const input = page.getByPlaceholder('Project name')
        await input.click()
        await page.keyboard.type('gw')
        await expect(input).toHaveValue('gw')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('ignores modifier combos', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+g')
        await page.keyboard.press('Control+g')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while settings owns the keyboard', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+s')
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

        await page.keyboard.press('g')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('ignores the letters inside the writer editor', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+w')

        const editor = page.locator('.milkdown .ProseMirror')
        await expect(editor).toBeVisible()
        await editor.click()
        await page.keyboard.type('gmail')

        await expect(editor).toContainText('gmail')
        await expect(page).toHaveURL(/localhost:4173/)
    })
})

test.describe('Quick link shortcut collisions', () => {
    async function configureTrello(page: Page): Promise<void> {
        await page.keyboard.press('Alt+s')
        const panel = page.locator('[data-settings-panel]')
        const ott = panel.locator('section').filter({ has: page.getByRole('heading', { name: 'OTT', exact: true }) })
        await ott.getByRole('button', { name: 'Other' }).click()
        await ott.getByPlaceholder('https://example.com').fill('trello.com')
        await expect(page.getByText('Saved')).toBeVisible()
        await page.getByRole('button', { name: 'Close settings' }).click()
        await expect(page.locator('aside').getByRole('button', { name: 'Trello' })).toBeVisible()
    }

    test('numbers the second claimant and opens it with a digit suffix', async ({ page }) => {
        await openHomeWithLinks(page)
        await configureTrello(page)

        await expect(page.locator('aside').getByRole('button', { name: 'Techflix' })).toHaveAttribute(
            'data-tooltip',
            'Techflix (T)'
        )
        await expect(page.locator('aside').getByRole('button', { name: 'Trello' })).toHaveAttribute(
            'data-tooltip',
            'Trello (T1)'
        )
        await expect(page.locator('aside').getByRole('button', { name: 'Trello' })).toHaveAttribute(
            'aria-keyshortcuts',
            'T 1'
        )

        await page.keyboard.press('t')
        await page.keyboard.press('1')
        await expect(page).toHaveURL(/^https:\/\/trello\.com/)
    })

    test('opens the first claimant with the bare letter', async ({ page }) => {
        await openHomeWithLinks(page)
        await configureTrello(page)

        await page.keyboard.press('t')
        await expect(page).toHaveURL(/^https:\/\/techflix\.club/)
    })

    test('abandons the pending prefix when another shortcut fires', async ({ page }) => {
        await openHomeWithLinks(page)
        await configureTrello(page)

        await page.keyboard.press('t')
        await page.keyboard.press('g')
        await expect(page).toHaveURL(/^https:\/\/mail\.google\.com/)
    })

    test('ignores the sequence while typing', async ({ page }) => {
        await openHomeWithLinks(page)
        await configureTrello(page)

        await page.keyboard.press('Alt+p')
        await page.getByRole('button', { name: 'New Project' }).click()
        const input = page.getByPlaceholder('Project name')
        await input.click()
        await page.keyboard.type('t1')
        await expect(input).toHaveValue('t1')
        await expect(page).toHaveURL(/localhost:4173/)
    })
})

test.describe('Quick link shortcuts on mobile', () => {
    test.use({ viewport: { width: 390, height: 780 } })

    test('does nothing while the quick links menu is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.getByRole('button', { name: 'Toggle quick links' }).click()
        await page.keyboard.press('g')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while the projects drawer is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.keyboard.press('Alt+p')
        await page.getByRole('button', { name: 'Open projects' }).click()
        await expect(page.getByRole('button', { name: 'New Project' })).toBeInViewport()

        await page.keyboard.press('g')
        await expect(page).toHaveURL(/localhost:4173/)
    })

    test('does nothing while the mobile nav menu is open', async ({ page }) => {
        await openHomeWithLinks(page)
        await page.getByRole('button', { name: 'Toggle Menu' }).click()
        await expect(page.getByRole('button', { name: 'Home' })).toBeInViewport()

        await page.keyboard.press('g')
        await expect(page).toHaveURL(/localhost:4173/)
    })
})
