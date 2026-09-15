import { expect, test } from '@playwright/test'

/**
 * Live smoke tests against the deployed site.
 *
 * Opt-in because it hits the public deployment:
 *   bun run test:e2e:live
 * Override the target with LIVE_BASE_URL.
 */
test.describe('Live deployment', () => {
    test.skip(process.env.E2E_LIVE !== '1', 'Set E2E_LIVE=1 to run live smoke tests')

    test('home page loads and hydrates', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('Queue', { exact: true })).toBeVisible({ timeout: 20_000 })
        await expect(page.getByRole('button', { name: 'Quick Todo (Alt + Q)' })).toBeVisible()
        await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible()
    })

    test('deep link to projects works', async ({ page }) => {
        await page.goto('/?view=projects')
        await expect(page.getByText(/Select a project|Projects/).first()).toBeVisible({ timeout: 20_000 })
    })
})
