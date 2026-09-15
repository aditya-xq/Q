import { expect, type Page } from '@playwright/test'

/** Navigate to the app root and wait until the shell has hydrated. */
export async function openHome(page: Page): Promise<void> {
    await page.goto('/')
    await expect(page.getByText('Queue', { exact: true })).toBeVisible()
    // The global keydown handler is attached in the layout's onMount.
    await page.waitForLoadState('networkidle')
}

/** Open the app and trigger a global view shortcut (Alt+Q / Alt+P / Alt+W). */
export async function openViewShortcut(page: Page, key: 'q' | 'p' | 'w'): Promise<void> {
    await openHome(page)
    await page.keyboard.press(`Alt+${key}`)
}

/** Wait until the writer reports that the current draft has been autosaved. */
export async function waitForAutosave(page: Page): Promise<void> {
    await expect(page.getByText(/Saved/).first()).toBeVisible({ timeout: 15_000 })
}
