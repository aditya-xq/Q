import { db, ensureDBReady, type Task } from '$lib/utils/db'
import { liveQuery, type Subscription } from 'dexie'
import { QUICK_TODO_PROJECT_ID } from '$lib/utils/constants'
import { appState } from '$lib/state.svelte'

export function sortQuickTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
        if (a.completed === b.completed) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return a.completed ? 1 : -1
    })
}

export async function loadQuickTasks(): Promise<Task[]> {
    await ensureDBReady()
    const tasks = await db.tasks.where('projectId').equals(QUICK_TODO_PROJECT_ID).toArray()
    return sortQuickTasks(tasks)
}

export function observeQuickTasks(): Subscription {
    return liveQuery(() => loadQuickTasks()).subscribe({
        next: (tasks) => {
            appState.quickTasks = tasks
        },
        error: (error) => console.error('Quick task observation failed:', error),
    })
}

async function refreshQuickTasks(): Promise<void> {
    appState.quickTasks = await loadQuickTasks()
}

export async function addQuickTask(text: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    const id = (await db.tasks.add({
        projectId: QUICK_TODO_PROJECT_ID,
        text: text.trim(),
        completed: false,
        createdAt,
        updatedAt: createdAt,
    })) as number
    await refreshQuickTasks()
    return id
}

export async function toggleQuickTask(taskId: number, text: string, completed: boolean): Promise<void> {
    await ensureDBReady()
    await db.tasks.update(taskId, { text, completed, updatedAt: new Date() })
    await refreshQuickTasks()
}

export async function deleteQuickTask(taskId: number): Promise<void> {
    await ensureDBReady()
    await db.tasks.delete(taskId)
    await refreshQuickTasks()
}
