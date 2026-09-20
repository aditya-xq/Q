import Dexie, { type Table } from 'dexie'
import type { NoteColor } from './notes'

export interface Writeup {
    id?: number
    content: string
    title: string
    updatedAt: Date
    createdAt: number
}

// Lightweight projection held in app state so draft bodies are not kept in memory.
export interface WriteupSummary {
    id: number
    title: string
    updatedAt: Date
    createdAt: number
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
    updatedAt: Date
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

export interface Note {
    id?: number
    text: string
    done: boolean
    color: NoteColor
    x: number
    y: number
    rotation: number
    pinned: boolean
    createdAt: Date
    updatedAt: Date
}

export class MyAppDB extends Dexie {
    writeups!: Table<Writeup, number>
    projects!: Table<Project, number>
    tasks!: Table<Task, number>
    quicklinks!: Table<QuickLink, number>
    settings!: Table<Setting, string>
    notes!: Table<Note, number>

    constructor() {
        super('MyAppDB')
        this.version(1).stores({
            writeups: '++id, content, updatedAt, createdAt',
            projects: '++id, title, createdAt',
            tasks: '++id, projectId, text, completed, createdAt, updatedAt',
            quicklinks: '++id, category, name, url',
            settings: '&key',
        })
        // Drop indexes on large free-text columns that are never queried.
        this.version(2).stores({
            writeups: '++id, updatedAt',
            projects: '++id',
            tasks: '++id, projectId',
            quicklinks: '++id, category',
            settings: '&key',
        })
        // Sticky notes board.
        this.version(3).stores({
            writeups: '++id, updatedAt',
            projects: '++id',
            tasks: '++id, projectId',
            quicklinks: '++id, category',
            settings: '&key',
            notes: '++id',
        })
    }
}

export const db = new MyAppDB()

// Promise that tracks database initialization state
let dbInitialized: Promise<void> | null = null

// Initialize the database with default data
export async function initializeDatabase() {
    // Return existing initialization promise if already running
    if (dbInitialized) return dbInitialized

    dbInitialized = (async () => {
        try {
            // Ensure database connection is open and ready
            await db.open()

            // Initialize default settings if they don't exist
            await initializeDefaultSettings()
        } catch (error) {
            console.error('Database initialization failed:', error)
            // Reset the promise so it can be retried
            dbInitialized = null
            throw error
        }
    })()

    return dbInitialized
}

// Initialize default settings in a single round-trip
async function initializeDefaultSettings() {
    const defaultSettings: Setting[] = [
        { key: 'showQuote', value: true },
        { key: 'showWeather', value: false },
    ]

    const existingKeys = new Set((await db.settings.toArray()).map((setting) => setting.key))
    const missing = defaultSettings.filter((setting) => !existingKeys.has(setting.key))
    if (missing.length > 0) {
        await db.settings.bulkPut(missing)
    }
}

// Helper to ensure DB is ready before any operation
export async function ensureDBReady() {
    await initializeDatabase()
}

// Helper function to get all settings at once (most efficient)
export async function getAllSettings(): Promise<Record<string, boolean | string | number>> {
    await ensureDBReady()
    const allSettings = await db.settings.toArray()
    return allSettings.reduce(
        (acc, setting) => {
            acc[setting.key] = setting.value
            return acc
        },
        {} as Record<string, boolean | string | number>
    )
}

// Helper function to set a setting
export async function setSetting(key: string, value: boolean | string | number): Promise<void> {
    await ensureDBReady()
    await db.settings.put({ key, value })
}

// Start initialization immediately in the browser but don't block module loading
if (typeof indexedDB !== 'undefined') {
    initializeDatabase().catch((error) => console.error('Failed to initialize database:', error))
}
