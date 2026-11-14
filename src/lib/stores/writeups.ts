import { appState } from '$lib/state.svelte'
import { db, type Writeup, ensureDBReady } from '$lib/utils/db'
import { toDate } from '$lib/utils/datetime'
import { toast } from '$lib/utils/notification'
import { deriveWriteupTitle } from '$lib/utils/writeup'
import { liveQuery, type Subscription } from 'dexie'

// The drafts list only needs the summary table, so autosave never reads every body.
export function observeWriteups(): Subscription {
    return liveQuery(() => db.writeupMeta.orderBy('updatedAt').reverse().toArray()).subscribe({
        next: (summaries) => {
            appState.writeups = summaries
        },
        error: (error) => console.error('Writeup observation failed:', error),
    })
}

export async function addWriteup(content: string, createdAt: Date): Promise<number> {
    await ensureDBReady()
    const updatedAt = new Date()
    const title = deriveWriteupTitle(content)
    return db.transaction('rw', db.writeups, db.writeupMeta, async () => {
        const id = (await db.writeups.add({ content, title, updatedAt, createdAt })) as number
        await db.writeupMeta.put({ id, title, updatedAt, createdAt })
        return id
    })
}

export async function updateWriteup(id: number, content: string): Promise<void> {
    await ensureDBReady()
    const updatedAt = new Date()
    const title = deriveWriteupTitle(content)
    await db.transaction('rw', db.writeups, db.writeupMeta, async () => {
        const stored = await db.writeups.get(id)
        if (!stored) return
        const createdAt = toDate(stored.createdAt) ?? toDate(stored.updatedAt) ?? updatedAt
        await db.writeups.update(id, { content, title, updatedAt, createdAt })
        await db.writeupMeta.put({ id, title, updatedAt, createdAt })
    })
}

export async function deleteWriteup(id: number): Promise<boolean> {
    try {
        await ensureDBReady()
        await db.transaction('rw', db.writeups, db.writeupMeta, async () => {
            await db.writeups.delete(id)
            await db.writeupMeta.delete(id)
        })
        return true
    } catch (error) {
        console.error('Failed to delete draft:', error)
        toast.error('Could not delete draft')
        return false
    }
}

export async function getWriteup(id: number): Promise<Writeup | undefined> {
    await ensureDBReady()
    const stored = await db.writeups.get(id)
    if (!stored) return undefined

    const updatedAt = toDate(stored.updatedAt) ?? new Date(0)
    const title =
        typeof stored.title === 'string' && stored.title.trim()
            ? stored.title.trim()
            : deriveWriteupTitle(stored.content ?? '')
    return {
        ...stored,
        title,
        updatedAt,
        createdAt: toDate(stored.createdAt) ?? updatedAt,
    }
}
