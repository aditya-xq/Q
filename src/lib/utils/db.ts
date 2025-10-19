import Dexie, { type Table } from 'dexie'

export interface Project {
    id?: number
    title: string
    createdAt: Date
}

export interface Task {
    id?: number
    projectId: number
    text: string
    completed: boolean
    createdAt: Date
}

export interface QuickLink {
    id?: number
    category: string
    name: string
    url: string
}

export interface Setting {
    key: string
    value: string | number | boolean
}

export class MyAppDB extends Dexie {
    projects!: Table<Project, number>
    tasks!: Table<Task, number>
    quicklinks!: Table<QuickLink, number>
    settings!: Table<Setting, string>

    constructor() {
        super('MyAppDB')
        this.version(1).stores({
            projects: '++id, title, createdAt',
            tasks: '++id, projectId, text, completed, createdAt',
            quicklinks: '++id, category, name, url',
            settings: '&key',
        })
    }
}

export const db = new MyAppDB()

// Initialize the database with the QuickTodo project
export async function initializeDatabase() {
    const QUICK_TODO_PROJECT_ID = -1

    // Check if the QuickTodo project already exists
    const quickTodoProject = await db.projects.get(QUICK_TODO_PROJECT_ID)

    if (!quickTodoProject) {
        await db.projects.put({
            id: QUICK_TODO_PROJECT_ID,
            title: 'Quick Todo',
            createdAt: new Date(),
        })
    }
}

// Call this function when your app starts
initializeDatabase().catch((error) => console.error('Failed to initialize database:', error))
