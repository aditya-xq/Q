import { appState } from '$lib/state.svelte'
import type { Project, Task, Writeup } from './db'
import { db } from './db'

export interface ProjectWithTasks extends Project {
    tasks: Task[]
}

// Special constant for QuickTodo
export const QUICK_TODO_PROJECT_ID = -1

// Ensure the QuickTodo project exists in the database
export async function ensureQuickTodoProject() {
    // Check if the QuickTodo project already exists
    const quickTodoProject = await db.projects.get(QUICK_TODO_PROJECT_ID)

    if (!quickTodoProject) {
        // Create the QuickTodo project if it doesn't exist
        await db.projects.add({
            id: QUICK_TODO_PROJECT_ID,
            title: 'Quick Todo',
            createdAt: new Date(),
        })
    }

    return QUICK_TODO_PROJECT_ID
}

// Loads projects from IndexedDB and fetches their tasks
// Excludes the special QuickTodo project
export async function loadProjects() {
    // Get all projects except the QuickTodo project
    const projects = await db.projects.where('id').notEqual(QUICK_TODO_PROJECT_ID).toArray()

    const projectsWithTasks: ProjectWithTasks[] = await Promise.all(
        projects.map(async (project) => {
            const tasks = await db.tasks
                .where('projectId')
                .equals(project.id as number)
                .toArray()
            return { ...project, tasks }
        })
    )
    appState.projectStore = projectsWithTasks
}

// Load writeups from the database
export async function loadWriteups() {
    const writeups = await db.writeups.orderBy('updatedAt').reverse().toArray()
    appState.writeupStore = writeups
}

// CRUD operations for projects
export async function addProject(title: string) {
    const createdAt = new Date()
    await db.projects.add({ title, createdAt })
    await loadProjects()
}

export async function updateProject(id: number, title: string) {
    await db.projects.update(id, { title })
    await loadProjects()
}

export async function deleteProject(id: number) {
    await db.projects.delete(id)
    // Remove associated tasks
    await db.tasks.where('projectId').equals(id).delete()
    await loadProjects()
}

// CRUD operations for tasks
export async function addTask(projectId: number, text: string) {
    const createdAt = new Date()
    const task = { projectId, text, completed: false, createdAt }
    await db.tasks.add(task)
    await loadProjects()
}

export async function updateTask(taskId: number, text: string, completed: boolean) {
    await db.tasks.update(taskId, { text, completed })
    await loadProjects()
}

export async function deleteTask(taskId: number) {
    await db.tasks.delete(taskId)
    await loadProjects()
}

export async function getSetting(key: string): Promise<string | number | boolean | undefined> {
    const setting = await db.settings.get(key)
    return setting?.value
}

export async function updateSetting(key: string, value: string | number | boolean) {
    await db.settings.put({ key, value })
}

// CRUD operations for writeups
export async function addWriteup(title: string, content: string): Promise<number> {
    const createdAt = new Date()
    const id = await db.writeups.add({ title, content, createdAt, updatedAt: createdAt })
    await loadWriteups()
    return id as number
}

export async function updateWriteup(id: number, title: string, content: string) {
    const updatedAt = new Date()
    await db.writeups.update(id, { title, content, updatedAt })
    await loadWriteups()
}

export async function deleteWriteup(id: number) {
    await db.writeups.delete(id)
    await loadWriteups()
}

export async function getWriteup(id: number): Promise<Writeup | undefined> {
    return db.writeups.get(id)
}
