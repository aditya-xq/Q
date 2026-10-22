import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

const accentOf = (page: import('@playwright/test').Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-accent').trim())

const isDark = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.documentElement.classList.contains('dark'))

const storedTheme = (page: import('@playwright/test').Page) =>
    page.evaluate(
        () =>
            new Promise<string | null>((resolve, reject) => {
                const request = indexedDB.open('MyAppDB')
                request.onerror = () => reject(request.error)
                request.onsuccess = () => {
                    const database = request.result
                    const get = database.transaction('settings', 'readonly').objectStore('settings').get('theme')
                    get.onsuccess = () => resolve(typeof get.result?.value === 'string' ? get.result.value : null)
                    get.onerror = () => reject(get.error)
                }
            })
    )

async function openDesigner(page: import('@playwright/test').Page) {
    await page.keyboard.press('Alt+a')
    const dialog = page.getByRole('dialog', { name: 'Theme designer' })
    await expect(dialog).toBeVisible()
    return dialog
}

test.describe('Theme', () => {
    test('follows the system preference by default', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' })
        await openHome(page)
        expect(await isDark(page)).toBe(false)

        await page.emulateMedia({ colorScheme: 'dark' })
        await expect.poll(() => isDark(page)).toBe(true)

        await page.emulateMedia({ colorScheme: 'light' })
        await expect.poll(() => isDark(page)).toBe(false)
    })

    test('an explicit light or dark choice overrides the system and survives a reload', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' })
        await openHome(page)
        await expect.poll(() => isDark(page)).toBe(true)

        const dialog = await openDesigner(page)
        await dialog.getByRole('button', { name: 'Light', exact: true }).click()
        await expect.poll(() => isDark(page)).toBe(false)
        await dialog.getByRole('button', { name: 'Done', exact: true }).click()
        await expect(dialog).toBeHidden()

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        expect(await isDark(page)).toBe(false)
    })

    test('persists the preset and mode in IndexedDB, not just the localStorage cache', async ({ page }) => {
        await openHome(page)
        const dialog = await openDesigner(page)
        await dialog.getByRole('button', { name: 'Retro', exact: true }).click()
        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await dialog.getByRole('button', { name: 'Done', exact: true }).click()

        // Wait for the debounced IndexedDB write itself, then drop the pre-paint cache.
        await expect.poll(async () => (await storedTheme(page))?.includes('"mode":"dark"') ?? false).toBe(true)
        await expect.poll(async () => (await storedTheme(page))?.includes('"preset":"retro"') ?? false).toBe(true)
        await page.evaluate(() => localStorage.removeItem('q:theme'))
        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()

        await expect.poll(() => isDark(page)).toBe(true)
        await expect.poll(() => accentOf(page)).toBe('#c2410c')
    })

    test('applies presets, custom colours and corners live', async ({ page }) => {
        await openHome(page)
        expect(await accentOf(page)).toBe('#06b6d4')

        const dialog = await openDesigner(page)
        await dialog.getByRole('button', { name: 'High Contrast', exact: true }).click()
        await expect.poll(() => accentOf(page)).toBe('#facc15')

        await dialog.getByRole('button', { name: 'Accent colour #ec4899' }).click()
        await expect.poll(() => accentOf(page)).toBe('#ec4899')

        const radius = dialog.getByRole('slider', { name: 'Corner radius' })
        await radius.evaluate((element: HTMLInputElement) => {
            element.value = '18'
            element.dispatchEvent(new Event('input', { bubbles: true }))
        })
        await expect
            .poll(() =>
                page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-radius').trim())
            )
            .toBe('18px')

        await dialog.getByRole('button', { name: 'Glass', exact: true }).click()
        await expect(page.locator('html')).toHaveAttribute('data-surface', 'glass')

        await dialog.getByRole('button', { name: 'Done', exact: true }).click()
        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect.poll(() => accentOf(page)).toBe('#ec4899')
        await expect
            .poll(() =>
                page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-radius').trim())
            )
            .toBe('18px')
    })

    test('reset restores the default look but keeps the chosen mode', async ({ page }) => {
        await openHome(page)
        const dialog = await openDesigner(page)
        await dialog.getByRole('button', { name: 'Terminal', exact: true }).click()
        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await expect.poll(() => isDark(page)).toBe(true)

        await dialog.getByRole('button', { name: 'Reset', exact: true }).click()
        await expect.poll(() => accentOf(page)).toBe('#06b6d4')
        expect(await isDark(page)).toBe(true)
    })

    test('updates the theme-colour meta tag with the page background', async ({ page }) => {
        await openHome(page)
        const meta = page.locator('meta[name="theme-color"]')
        const background = () =>
            page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-bg').trim())
        const metaMatchesBackground = () =>
            page.evaluate(() => {
                const content = document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
                const background = getComputedStyle(document.documentElement).getPropertyValue('--q-bg').trim()
                return content === background
            })

        await expect(meta).toHaveAttribute('content', await background())

        const dialog = await openDesigner(page)
        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await expect.poll(metaMatchesBackground).toBe(true)
    })

    test('syncs a theme change to another tab', async ({ context }) => {
        const first = await context.newPage()
        await openHome(first)
        const second = await context.newPage()
        await openHome(second)
        expect(await isDark(second)).toBe(false)

        const dialog = await openDesigner(first)
        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await dialog.getByRole('button', { name: 'Done', exact: true }).click()

        await expect.poll(() => isDark(second)).toBe(true)
        expect(await accentOf(second)).toBe(await accentOf(first))
    })

    test('closes on Escape, returns focus to the trigger and blocks quick-link shortcuts', async ({ page }) => {
        await openHome(page)
        const trigger = page.getByRole('button', { name: 'Appearance (Alt + A)' })
        await trigger.click()

        const dialog = page.getByRole('dialog', { name: 'Theme designer' })
        await expect(dialog).toBeVisible()
        await page.keyboard.press('e')
        await expect(page).toHaveURL(/localhost:4173/)

        // The designer is modal: view/settings shortcuts stay out of the way.
        await page.keyboard.press('Alt+p')
        await page.keyboard.press('Alt+s')
        await expect(page).toHaveURL(/localhost:4173\/$/)
        await expect(page.locator('[data-settings-panel][data-shortcut-blocker]')).toHaveCount(0)

        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
    })

    test('settings closes on Escape', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+s')
        await expect(page.locator('[data-settings-panel][data-shortcut-blocker]')).toHaveCount(1)

        await page.keyboard.press('Escape')
        await expect(page.locator('[data-settings-panel][data-shortcut-blocker]')).toHaveCount(0)
    })
})

test.describe('Theme designer on mobile', () => {
    test.use({ viewport: { width: 390, height: 780 } })

    test('opens from the menu as a usable sheet and closes without navigating', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Toggle Menu' }).click()
        await page.getByRole('button', { name: 'Appearance (Alt + A)' }).click()

        const dialog = page.getByRole('dialog', { name: 'Theme designer' })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('button', { name: 'Prism', exact: true })).toBeVisible()

        await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
        await expect.poll(() => isDark(page)).toBe(true)

        await dialog.getByRole('button', { name: 'Done', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(page).toHaveURL(/localhost:4173/)
    })
})
