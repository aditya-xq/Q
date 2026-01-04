import { appState } from "$lib/state.svelte"
import { db, type Writeup, ensureDBReady } from "$lib/utils/db"

// Load write-ups from the database
export async function loadWriteups() {
    await ensureDBReady()
    
    const writeups = await db.writeups.orderBy('updatedAt').reverse().toArray()
    appState.writeups = writeups
}

export async function addWriteup(content: string, createdAt?: number): Promise<number> {
    await ensureDBReady()
    
    const updatedAt = new Date()
    const id = await db.writeups.add({ content, updatedAt, createdAt })
    await loadWriteups()
    return id as number
}

export async function updateWriteup(id: number, content: string) {
    await ensureDBReady()
    
    const updatedAt = new Date()
    await db.writeups.update(id, { content, updatedAt })
    await loadWriteups()
}

export async function deleteWriteup(id: number) {
    await ensureDBReady()
    
    await db.writeups.delete(id)
    await loadWriteups()
}

export async function getWriteup(id: number): Promise<Writeup | undefined> {
    await ensureDBReady()
    
    return db.writeups.get(id)
}
