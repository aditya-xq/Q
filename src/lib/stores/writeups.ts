import { appState } from "$lib/state.svelte"
import { db, type Writeup } from "$lib/utils/db"

// Load writeups from the database
export async function loadWriteups() {
    const writeups = await db.writeups.orderBy('updatedAt').reverse().toArray()
    appState.writeups = writeups
}

export async function addWriteup(content: string): Promise<number> {
    const createdAt = new Date()
    const id = await db.writeups.add({ content, updatedAt: createdAt })
    await loadWriteups()
    return id as number
}

export async function updateWriteup(id: number, content: string) {
    const updatedAt = new Date()
    await db.writeups.update(id, { content, updatedAt })
    await loadWriteups()
}

export async function deleteWriteup(id: number) {
    await db.writeups.delete(id)
    await loadWriteups()
}

export async function getWriteup(id: number): Promise<Writeup | undefined> {
    return db.writeups.get(id)
}
