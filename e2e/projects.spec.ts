import { expect, test, type Page } from '@playwright/test'
import { openViewShortcut } from './helpers'

async function createProject(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'New Project' }).click()
    const input = page.getByPlaceholder('Project name')
    await input.fill(name)
    await input.press('Enter')
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

async function addTask(page: Page, text: string): Promise<void> {
    const input = page.getByPlaceholder('Add a new task...')
    await input.fill(text)
    await input.press('Enter')
    await expect(page.getByText(text, { exact: true })).toBeVisible()
}

test.describe('Projects', () => {
    test('create project, add/complete/delete a task', async ({ page }) => {
        await openViewShortcut(page, 'p')

        await expect(page.getByText('Select a project to view tasks')).toBeVisible()

        await createProject(page, 'Alpha')

        await addTask(page, 'First task')

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed Tasks (1)')).toBeVisible()

        // Completing auto-expands the completed section; delete the task.
        await page.getByRole('button', { name: 'Delete task' }).first().click()
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
        await expect(page.getByText('No tasks yet. Add your first task below.')).toBeVisible()
    })

    test('edits a task title inline', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Beta')
        await addTask(page, 'Original text')

        await page.getByText('Original text').click()
        const editInput = page.locator('input[id^="task-edit-"]')
        await expect(editInput).toBeVisible()
        await editInput.fill('Edited text')
        await editInput.press('Enter')

        await expect(page.getByText('Edited text')).toBeVisible()
    })

    test('auto-selects the most recent project after reload', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Gamma')

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await page.goto('/?view=projects')
        await expect(page.getByRole('heading', { name: 'Gamma', level: 1 })).toBeVisible()
    })

    test('selects a newly created project ahead of older ones', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'First')
        await createProject(page, 'Second')

        await expect(page.getByRole('heading', { name: 'Second', level: 1 })).toBeVisible()
    })

    test('ignores blank project names', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await page.getByRole('button', { name: 'New Project' }).click()

        const input = page.getByPlaceholder('Project name')
        await input.fill('   ')
        await input.press('Enter')

        // The form stays open and no project is created.
        await expect(input).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)

        await input.press('Escape')
        await expect(page.getByPlaceholder('Project name')).toHaveCount(0)
    })

    test('cancels adding a project with the Cancel button', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await page.getByRole('button', { name: 'New Project' }).click()
        await page.getByPlaceholder('Project name').fill('Discarded')
        await page.getByRole('button', { name: 'Cancel' }).click()

        await expect(page.getByPlaceholder('Project name')).toHaveCount(0)
        await expect(page.getByText('Discarded')).toHaveCount(0)
    })

    test('deletes a project together with its tasks', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Doomed')
        await addTask(page, 'Orphan task')

        await page.getByRole('button', { name: 'Delete project' }).first().click()
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click()

        await expect(page.getByText('Select a project to view tasks')).toBeVisible()
        await expect(page.getByText('Doomed')).toHaveCount(0)

        await page.reload()
        await page.goto('/?view=projects')
        await expect(page.getByText('Doomed')).toHaveCount(0)
        await expect(page.getByText('Orphan task')).toHaveCount(0)
    })

    test('cancels deleting a project', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'KeepMe')

        await page.getByRole('button', { name: 'Delete project' }).first().click()
        await page.getByRole('button', { name: 'Cancel' }).click()

        await expect(page.getByRole('heading', { name: 'KeepMe', level: 1 })).toBeVisible()
    })

    test('rejects blank task text and trims whitespace', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Tasks')

        const input = page.getByPlaceholder('Add a new task...')
        await input.fill('   ')
        await input.press('Enter')
        await expect(page.getByText('No tasks yet. Add your first task below.')).toBeVisible()

        await input.fill('  padded  ')
        await input.press('Enter')
        await expect(page.getByText('padded', { exact: true })).toBeVisible()
    })

    test('cancels a task edit with Escape', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Edits')
        await addTask(page, 'Original')

        await page.getByText('Original').click()
        const editInput = page.locator('input[id^="task-edit-"]')
        await editInput.fill('Changed')
        await editInput.press('Escape')

        await expect(page.getByText('Original')).toBeVisible()
        await expect(page.getByText('Changed')).toHaveCount(0)
    })

    test('does not save an empty task edit', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Empty edit')
        await addTask(page, 'Keep this')

        await page.getByText('Keep this').click()
        const editInput = page.locator('input[id^="task-edit-"]')
        await editInput.fill('')
        await editInput.press('Enter')
        await editInput.press('Escape')

        await expect(page.getByText('Keep this')).toBeVisible()
    })

    test('unchecks a completed task and removes the completed section', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Toggle')
        await addTask(page, 'Flip me')

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed Tasks (1)')).toBeVisible()

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed Tasks')).toHaveCount(0)
        await expect(page.getByText('Flip me')).toBeVisible()
    })

    test('collapses and expands the completed tasks section', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Accordion')
        await addTask(page, 'Done thing')

        await page.locator('label:has(input[type="checkbox"])').first().click()
        const toggle = page.getByRole('button', { name: /Completed Tasks \(1\)/ })
        await expect(page.getByText('Done thing')).toBeVisible()

        await toggle.click()
        await expect(page.getByText('Done thing')).toBeHidden()

        await toggle.click()
        await expect(page.getByText('Done thing')).toBeVisible()
    })

    test('shows the per-project task count', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await createProject(page, 'Counted')

        await addTask(page, 'One')
        await expect(page.getByText('1 task', { exact: true })).toBeVisible()

        await addTask(page, 'Two')
        await expect(page.getByText('2 tasks', { exact: true })).toBeVisible()
    })
})
