import Dexie, { type Table } from 'dexie'

export interface Writeup {
    id?: number
    content: string
    updatedAt: Date
    createdAt: number | undefined
}

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
    writeups!: Table<Writeup, number>
    projects!: Table<Project, number>
    tasks!: Table<Task, number>
    quicklinks!: Table<QuickLink, number>
    settings!: Table<Setting, string>

    constructor() {
        super('MyAppDB')
        this.version(1).stores({
            writeups: '++id, content, updatedAt, createdAt',
            projects: '++id, title, createdAt',
            tasks: '++id, projectId, text, completed, createdAt',
            quicklinks: '++id, &category, name, url',
            settings: '&key',
        })
    }
}

export const db = new MyAppDB()

// Initialize the database with default data
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

    // Initialize default settings if they don't exist
    await initializeDefaultSettings()
}

// Initialize default settings
async function initializeDefaultSettings() {
    const defaultSettings = {
        keepQuickPanelOpen: false,
        showQuote: true,
        showWeather: true,
    }

    for (const [key, value] of Object.entries(defaultSettings)) {
        const existing = await db.settings.get(key)
        if (!existing) {
            await db.settings.put({ key, value })
        }
    }
}

// Helper function to get a setting with type safety
export async function getSetting<T = boolean | string | number>(
    key: string,
    defaultValue?: T
): Promise<T | undefined> {
    const setting = await db.settings.get(key)
    return setting ? (setting.value as T) : defaultValue
}

// Helper function to set a setting
export async function setSetting(key: string, value: boolean | string | number): Promise<void> {
    await db.settings.put({ key, value })
}

// Call this function when your app starts
initializeDatabase().catch((error) => console.error('Failed to initialize database:', error))
