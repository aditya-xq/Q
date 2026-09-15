import { appState } from '$lib/state.svelte'
import type { Project, Task } from './db'
import { db, ensureDBReady } from './db'
import { QUICK_TODO_PROJECT_ID } from './constants'
import { liveQuery, type Subscription } from 'dexie'

export interface ProjectWithTasks extends Project {
    tasks: Task[]
}

export { QUICK_TODO_PROJECT_ID }

// Ensure the QuickTodo project exists in the database
export async function ensureQuickTodoProject() {
    await ensureDBReady()
    return QUICK_TODO_PROJECT_ID
}

function groupTasksByProject(projects: Project[], tasks: Task[]): ProjectWithTasks[] {
    const byProject = new Map<number, Task[]>()
    for (const task of tasks) {
        const list = byProject.get(task.projectId)
        if (list) list.push(task)
        else byProject.set(task.projectId, [task])
    }
    return projects.map((project) => ({
        ...project,
        tasks: byProject.get(project.id as number) ?? [],
    }))
}

async function queryProjects(): Promise<ProjectWithTasks[]> {
    await ensureDBReady()
    const [projects, tasks] = await Promise.all([
        db.projects.where('id').notEqual(QUICK_TODO_PROJECT_ID).toArray(),
        db.tasks.toArray(),
    ])
    projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return groupTasksByProject(projects, tasks)
}

// Loads projects (excluding the QuickTodo pseudo-project) with tasks in two queries.
export async function loadProjects(): Promise<void> {
    appState.projectStore = await queryProjects()
}

// Keeps projectStore in sync across tabs / mutations.
export function observeProjects(): Subscription {
    return liveQuery(queryProjects).subscribe({
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
    const id = (await db.projects.add({ title: title.trim(), createdAt })) as number
    await loadProjects()
    return id
}

export async function updateProject(id: number, title: string): Promise<void> {
    await ensureDBReady()
    await db.projects.update(id, { title })
    await loadProjects()
}

export async function deleteProject(id: number): Promise<void> {
    await ensureDBReady()
    await db.projects.delete(id)
    await db.tasks.where('projectId').equals(id).delete()
    await loadProjects()
}

// CRUD operations for tasks
export async function addTask(projectId: number, text: string): Promise<number> {
    await ensureDBReady()
    const createdAt = new Date()
    const id = (await db.tasks.add({
        projectId,
        text: text.trim(),
        completed: false,
        createdAt,
        updatedAt: createdAt,
    })) as number
    await loadProjects()
    return id
}

export async function updateTask(taskId: number, text: string, completed: boolean): Promise<void> {
    await ensureDBReady()
    await db.tasks.update(taskId, { text, completed, updatedAt: new Date() })
    await loadProjects()
}

export async function deleteTask(taskId: number): Promise<void> {
    await ensureDBReady()
    await db.tasks.delete(taskId)
    await loadProjects()
}
