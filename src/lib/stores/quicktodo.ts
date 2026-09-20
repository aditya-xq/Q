import { db, ensureDBReady } from '$lib/utils/db'
import { liveQuery, type Subscription } from 'dexie'
import { QUICK_TODO_PROJECT_ID } from '$lib/utils/constants'
import { sortQuickTasks } from '$lib/utils/tasks'
import { appState } from '$lib/state.svelte'

export function observeQuickTasks(): Subscription {
    // The read is issued synchronously so Dexie's liveQuery can track it.
    return liveQuery(() =>
        db.tasks.where('projectId').equals(QUICK_TODO_PROJECT_ID).toArray().then(sortQuickTasks)
    ).subscribe({
        next: (tasks) => {
            appState.quickTasks = tasks
        },
        error: (error) => console.error('Quick task observation failed:', error),
    })
}

export async function addQuickTask(text: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    return (await db.tasks.add({
        projectId: QUICK_TODO_PROJECT_ID,
        text: text.trim(),
        completed: false,
        createdAt,
        updatedAt: createdAt,
    })) as number
}

export async function toggleQuickTask(taskId: number, text: string, completed: boolean): Promise<void> {
    await ensureDBReady()
    await db.tasks.update(taskId, { text, completed, updatedAt: new Date() })
}

export async function deleteQuickTask(taskId: number): Promise<void> {
    await ensureDBReady()
    await db.tasks.delete(taskId)
}
