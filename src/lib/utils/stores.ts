import { appState } from '$lib/state.svelte'
import { db, ensureDBReady } from './db'
import { groupTasksByProject, sortProjectsByUpdatedAtDesc, type ProjectWithTasks } from './tasks'
import { liveQuery, type Subscription } from 'dexie'

export type { ProjectWithTasks }

// Legacy Quick Todo rows lived under a reserved project id. The feature was removed;
// keep any existing rows out of the project lists instead of deleting user data.
const LEGACY_QUICK_TODO_PROJECT_ID = -1

function readProjects(): Promise<ProjectWithTasks[]> {
    // Reads are issued synchronously so Dexie's liveQuery can track them.
    const projectsPromise = db.projects.where('id').notEqual(LEGACY_QUICK_TODO_PROJECT_ID).toArray()
    const tasksPromise = db.tasks.where('projectId').notEqual(LEGACY_QUICK_TODO_PROJECT_ID).toArray()
    return Promise.all([projectsPromise, tasksPromise]).then(([projects, tasks]) =>
        groupTasksByProject(sortProjectsByUpdatedAtDesc(projects), tasks)
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
    return (await db.projects.add({ title: title.trim(), createdAt, updatedAt: createdAt })) as number
}

export async function updateProject(id: number, title: string): Promise<void> {
    await ensureDBReady()
    await db.projects.update(id, { title, updatedAt: new Date() })
}

export async function deleteProject(id: number): Promise<void> {
    await ensureDBReady()
    await db.transaction('rw', db.projects, db.tasks, async () => {
        await db.projects.delete(id)
        await db.tasks.where('projectId').equals(id).delete()
    })
}

async function touchProject(projectId: number, at: Date = new Date()): Promise<void> {
    await db.projects.update(projectId, { updatedAt: at })
}

// CRUD operations for tasks
export async function addTask(projectId: number, text: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    return db.transaction('rw', db.tasks, db.projects, async () => {
        const id = (await db.tasks.add({
            projectId,
            text: text.trim(),
            completed: false,
            createdAt,
            updatedAt: createdAt,
        })) as number
        await touchProject(projectId, createdAt)
        return id
    })
}

export async function updateTask(taskId: number, text: string, completed: boolean): Promise<void> {
    await ensureDBReady()
    await db.transaction('rw', db.tasks, db.projects, async () => {
        const task = await db.tasks.get(taskId)
        if (!task) return
        const updatedAt = new Date()
        await db.tasks.update(taskId, { text, completed, updatedAt })
        await touchProject(task.projectId, updatedAt)
    })
}

export async function deleteTask(taskId: number): Promise<void> {
    await ensureDBReady()
    await db.transaction('rw', db.tasks, db.projects, async () => {
        const task = await db.tasks.get(taskId)
        if (!task) return
        await db.tasks.delete(taskId)
        await touchProject(task.projectId)
    })
}

// Clears a project's finished tasks in one transaction; resolves with the number removed.
export async function deleteCompletedTasks(projectId: number): Promise<number> {
    await ensureDBReady()
    return db.transaction('rw', db.tasks, db.projects, async () => {
        const removed = await db.tasks
            .where('projectId')
            .equals(projectId)
            .filter((task) => task.completed)
            .delete()
        if (removed > 0) await touchProject(projectId)
        return removed
    })
}
