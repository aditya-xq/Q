import { expect, test, type BrowserContext } from '@playwright/test'
import { openHome } from './helpers'

async function openTwoTabs(context: BrowserContext) {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await Promise.all([openHome(tabA), openHome(tabB)])
    return { tabA, tabB }
}

test.describe('Cross-tab sync', () => {
    test('projects created in one tab appear in another', async ({ context }) => {
        const { tabA, tabB } = await openTwoTabs(context)

        await tabA.keyboard.press('Alt+p')
        await tabA.getByRole('button', { name: 'New Project' }).click()
        const input = tabA.getByPlaceholder('Project name')
        await input.fill('Shared Project')
        await input.press('Enter')
        await expect(tabA.getByRole('heading', { name: 'Shared Project', level: 1 })).toBeVisible()

        await tabB.keyboard.press('Alt+p')
        await expect(tabB.getByRole('heading', { name: 'Shared Project', level: 1 })).toBeVisible()
    })

    test('sticky notes added in one tab appear in another', async ({ context }) => {
        const { tabA, tabB } = await openTwoTabs(context)

        await tabA.keyboard.press('Alt+q')
        const input = tabA.getByTestId('sticky-note').getByRole('textbox')
        await input.fill('Cross-tab note')
        await tabA.keyboard.press('Enter')
        await tabA.keyboard.press('Enter')

        await expect(tabB.getByTestId('sticky-note')).toHaveCount(1)
        await expect(tabB.getByTestId('sticky-note').getByRole('textbox')).toHaveValue('Cross-tab note')
    })
})
