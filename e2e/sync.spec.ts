import { expect, test, type BrowserContext } from '@playwright/test'
import { openHome } from './helpers'

async function openTwoTabs(context: BrowserContext) {
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await Promise.all([openHome(tabA), openHome(tabB)])
    return { tabA, tabB }
}

test.describe('Cross-tab sync', () => {
    test('quick tasks added in one tab appear in another', async ({ context }) => {
        const { tabA, tabB } = await openTwoTabs(context)

        await tabA.keyboard.press('Alt+q')
        const input = tabA.getByPlaceholder('Add a task and press Enter...')
        await input.fill('Cross-tab task')
        await input.press('Enter')
        await expect(tabA.getByText('Cross-tab task')).toBeVisible()

        await tabB.keyboard.press('Alt+q')
        await expect(tabB.getByText('Cross-tab task')).toBeVisible()
    })

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

    test('deleting a quick task in one tab removes it in another', async ({ context }) => {
        const { tabA, tabB } = await openTwoTabs(context)

        await tabA.keyboard.press('Alt+q')
        const inputA = tabA.getByPlaceholder('Add a task and press Enter...')
        await inputA.fill('Disposable task')
        await inputA.press('Enter')

        await tabB.keyboard.press('Alt+q')
        await expect(tabB.getByText('Disposable task')).toBeVisible()

        await tabB.getByText('Disposable task').first().hover()
        await tabB.getByRole('button', { name: 'Delete task' }).first().click()

        await expect(tabA.getByText('Disposable task')).toHaveCount(0)
        await expect(tabB.getByText('Disposable task')).toHaveCount(0)
    })
})
