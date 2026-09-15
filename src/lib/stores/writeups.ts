import { appState } from '$lib/state.svelte'
import { db, type Writeup, ensureDBReady } from '$lib/utils/db'
import { liveQuery, type Subscription } from 'dexie'

// Load write-ups from the database (most recently updated first)
export async function loadWriteups(): Promise<void> {
    await ensureDBReady()
    appState.writeups = await db.writeups.orderBy('updatedAt').reverse().toArray()
}

// Keep writeups in sync across tabs / mutations.
export function observeWriteups(): Subscription {
    return liveQuery(async () => {
        await ensureDBReady()
        return db.writeups.orderBy('updatedAt').reverse().toArray()
    }).subscribe({
        next: (writeups) => {
            appState.writeups = writeups
        },
        error: (error) => console.error('Writeup observation failed:', error),
    })
}

export async function addWriteup(content: string, createdAt: number): Promise<number> {
    await ensureDBReady()
    const updatedAt = new Date()
    const id = (await db.writeups.add({ content, updatedAt, createdAt })) as number
    await loadWriteups()
    return id
}

export async function updateWriteup(id: number, content: string): Promise<void> {
    await ensureDBReady()
    const updatedAt = new Date()
    await db.writeups.update(id, { content, updatedAt })
    await loadWriteups()
}

export async function deleteWriteup(id: number): Promise<void> {
    await ensureDBReady()
    await db.writeups.delete(id)
    await loadWriteups()
}

export async function getWriteup(id: number): Promise<Writeup | undefined> {
    await ensureDBReady()
    return db.writeups.get(id)
}
