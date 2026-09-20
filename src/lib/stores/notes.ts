import { db, ensureDBReady, type Note } from '$lib/utils/db'
import { liveQuery, type Subscription } from 'dexie'
import { appState } from '$lib/state.svelte'
import { nextFreeNotePosition, noteRotation, pickNoteColor } from '$lib/utils/notes'
import { toast } from '$lib/utils/notification'

export function observeNotes(): Subscription {
    // The read is issued synchronously so Dexie's liveQuery can track it.
    return liveQuery(() => db.notes.toArray()).subscribe({
        next: (notes) => {
            // `pinned` was added after the table shipped; normalise legacy rows.
            appState.notes = notes.map((note) => ({ ...note, pinned: note.pinned ?? false }))
        },
        error: (error) => console.error('Note observation failed:', error),
    })
}

export async function addNote(input: {
    text?: string
    done?: boolean
    color: Note['color']
    x: number
    y: number
    rotation: number
    pinned?: boolean
}): Promise<number | undefined> {
    try {
        await ensureDBReady()
        const now = new Date()
        return (await db.notes.add({
            text: input.text ?? '',
            done: input.done ?? false,
            color: input.color,
            x: input.x,
            y: input.y,
            rotation: input.rotation,
            pinned: input.pinned ?? false,
            createdAt: now,
            updatedAt: now,
        })) as number
    } catch (error) {
        console.error('Failed to add note:', error)
        toast.error('Could not create note', 3500)
        return undefined
    }
}

export async function updateNote(
    id: number,
    patch: Partial<Pick<Note, 'text' | 'done' | 'color' | 'x' | 'y' | 'pinned'>>
): Promise<void> {
    try {
        await ensureDBReady()
        await db.notes.update(id, { ...patch, updatedAt: new Date() })
    } catch (error) {
        console.error('Failed to update note:', error)
        toast.error('Could not save note', 3500)
    }
}

export async function deleteNote(id: number): Promise<void> {
    try {
        await ensureDBReady()
        await db.notes.delete(id)
    } catch (error) {
        console.error('Failed to delete note:', error)
        toast.error('Could not delete note', 3500)
    }
}

/** Create a new note near the centre of the viewport and focus it. */
export async function createNote(): Promise<number | undefined> {
    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
    const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
    const seed = Date.now()
    const { x, y } = nextFreeNotePosition(appState.notes, viewportWidth, viewportHeight)

    const id = await addNote({
        color: pickNoteColor(seed),
        x,
        y,
        rotation: noteRotation(seed),
    })
    if (typeof id === 'number') {
        appState.composeNoteId = id
    }
    return id
}
