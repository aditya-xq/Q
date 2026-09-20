import { appState } from '$lib/state.svelte'
import { db, ensureDBReady } from './db'
import { QUICK_TODO_PROJECT_ID } from './constants'
import { groupTasksByProject, sortProjectsByCreatedAtDesc, type ProjectWithTasks } from './tasks'
import { liveQuery, type Subscription } from 'dexie'

export { QUICK_TODO_PROJECT_ID }
export type { ProjectWithTasks }

// Ensure the QuickTodo project exists in the database
export async function ensureQuickTodoProject() {
    await ensureDBReady()
    return QUICK_TODO_PROJECT_ID
}

function readProjects(): Promise<ProjectWithTasks[]> {
    // Reads are issued synchronously so Dexie's liveQuery can track them.
    const projectsPromise = db.projects.where('id').notEqual(QUICK_TODO_PROJECT_ID).toArray()
    const tasksPromise = db.tasks.where('projectId').notEqual(QUICK_TODO_PROJECT_ID).toArray()
    return Promise.all([projectsPromise, tasksPromise]).then(([projects, tasks]) =>
        groupTasksByProject(sortProjectsByCreatedAtDesc(projects), tasks)
    )
}

// Keeps projectStore in sync across tabs / mutations.
export function observeProjects(): Subscription {
    return liveQuery(readProjects).subscribe({
        next: (projects) => {
            appState.projectStore = projects
        },
        error: (error) => console.error('Project observation failed:', error),
    })
}

// CRUD operations for projects
export async function addProject(title: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    return (await db.projects.add({ title: title.trim(), createdAt })) as number
}

export async function updateProject(id: number, title: string): Promise<void> {
    await ensureDBReady()
    await db.projects.update(id, { title })
}

export async function deleteProject(id: number): Promise<void> {
    await ensureDBReady()
    await db.transaction('rw', db.projects, db.tasks, async () => {
        await db.projects.delete(id)
        await db.tasks.where('projectId').equals(id).delete()
    })
}

// CRUD operations for tasks
export async function addTask(projectId: number, text: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    return (await db.tasks.add({
        projectId,
        text: text.trim(),
        completed: false,
        createdAt,
        updatedAt: createdAt,
    })) as number
}

export async function updateTask(taskId: number, text: string, completed: boolean): Promise<void> {
    await ensureDBReady()
    await db.tasks.update(taskId, { text, completed, updatedAt: new Date() })
}

export async function deleteTask(taskId: number): Promise<void> {
    await ensureDBReady()
    await db.tasks.delete(taskId)
}
