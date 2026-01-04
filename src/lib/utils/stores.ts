import { appState } from '$lib/state.svelte'
import type { Project, Task } from './db'
import { db, ensureDBReady } from './db'

export interface ProjectWithTasks extends Project {
    tasks: Task[]
}

// Special constant for QuickTodo
export const QUICK_TODO_PROJECT_ID = -1

// Ensure the QuickTodo project exists in the database
export async function ensureQuickTodoProject() {
    await ensureDBReady()
    
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
    await ensureDBReady()
    
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

// CRUD operations for projects
export async function addProject(title: string) {
    await ensureDBReady()
    
    const createdAt = new Date()
    await db.projects.add({ title, createdAt })
    await loadProjects()
}

export async function updateProject(id: number, title: string) {
    await ensureDBReady()
    
    await db.projects.update(id, { title })
    await loadProjects()
}

export async function deleteProject(id: number) {
    await ensureDBReady()
    
    await db.projects.delete(id)
    // Remove associated tasks
    await db.tasks.where('projectId').equals(id).delete()
    await loadProjects()
}

// CRUD operations for tasks
export async function addTask(projectId: number, text: string) {
    await ensureDBReady()
    
    const createdAt = new Date()
    const task = { projectId, text, completed: false, createdAt }
    await db.tasks.add(task)
    await loadProjects()
}

export async function updateTask(taskId: number, text: string, completed: boolean) {
    await ensureDBReady()
    
    await db.tasks.update(taskId, { text, completed })
    await loadProjects()
}

export async function deleteTask(taskId: number) {
    await ensureDBReady()
    
    await db.tasks.delete(taskId)
    await loadProjects()
}
