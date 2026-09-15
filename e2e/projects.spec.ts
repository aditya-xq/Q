import { expect, test } from '@playwright/test'
import { openViewShortcut } from './helpers'

test.describe('Projects', () => {
    test('create project, add/complete/delete a task', async ({ page }) => {
        await openViewShortcut(page, 'p')

        await expect(page.getByText('Select a project to view tasks')).toBeVisible()

        await page.getByRole('button', { name: 'New Project' }).click()
        const projectInput = page.getByPlaceholder('Project name')
        await projectInput.fill('Alpha')
        await projectInput.press('Enter')

        await expect(page.getByRole('heading', { name: 'Alpha', level: 1 })).toBeVisible()

        const taskInput = page.getByPlaceholder('Add a new task...')
        await taskInput.fill('First task')
        await taskInput.press('Enter')
        await expect(page.getByText('First task')).toBeVisible()

        await page.locator('label:has(input[type="checkbox"])').first().click()
        await expect(page.getByText('Completed Tasks (1)')).toBeVisible()

        // Completing auto-expands the completed section; delete the task.
        await page.getByRole('button', { name: 'Delete task' }).first().click()
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
        await expect(page.getByText('No tasks yet. Add your first task below.')).toBeVisible()
    })

    test('edits a task title inline', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await page.getByRole('button', { name: 'New Project' }).click()
        const projectInput = page.getByPlaceholder('Project name')
        await projectInput.fill('Beta')
        await projectInput.press('Enter')

        const taskInput = page.getByPlaceholder('Add a new task...')
        await taskInput.fill('Original text')
        await taskInput.press('Enter')

        await page.getByText('Original text').click()
        const editInput = page.locator('input[id^="task-edit-"]')
        await expect(editInput).toBeVisible()
        await editInput.fill('Edited text')
        await editInput.press('Enter')

        await expect(page.getByText('Edited text')).toBeVisible()
    })

    test('auto-selects the most recent project after reload', async ({ page }) => {
        await openViewShortcut(page, 'p')
        await page.getByRole('button', { name: 'New Project' }).click()
        const projectInput = page.getByPlaceholder('Project name')
        await projectInput.fill('Gamma')
        await projectInput.press('Enter')
        await expect(page.getByRole('heading', { name: 'Gamma', level: 1 })).toBeVisible()

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await page.goto('/?view=projects')
        await expect(page.getByRole('heading', { name: 'Gamma', level: 1 })).toBeVisible()
    })
})
