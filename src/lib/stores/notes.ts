import { db, ensureDBReady, type Note, type NotePoint } from '$lib/utils/db'
import { liveQuery, type Subscription } from 'dexie'
import { appState } from '$lib/state.svelte'
import { noteRotation, noteStagePosition, pickNoteColor, splitNoteText } from '$lib/utils/notes'
import { toast } from '$lib/utils/notification'

type StoredNote = Omit<Note, 'points'> & { points?: NotePoint[]; text?: string; done?: boolean }

/** Accept the v4 `points` shape and fall back to legacy `text`/`done` rows. */
function normalizePoints(note: StoredNote): NotePoint[] {
    if (Array.isArray(note.points) && note.points.length > 0) {
        return note.points.map((point) => ({ text: point.text ?? '', done: Boolean(point.done) }))
    }
    return splitNoteText(note.text, Boolean(note.done))
}

export function observeNotes(): Subscription {
    // The read is issued synchronously so Dexie's liveQuery can track it.
    return liveQuery(() => db.notes.toArray()).subscribe({
        next: (notes) => {
            appState.notes = notes.map((note) => ({ ...note, points: normalizePoints(note) }))
        },
        error: (error) => console.error('Note observation failed:', error),
    })
}

export async function addNote(input: {
    points?: NotePoint[]
    color: Note['color']
    x: number
    y: number
    rotation: number
}): Promise<number | undefined> {
    try {
        await ensureDBReady()
        const now = new Date()
        return (await db.notes.add({
            points: input.points && input.points.length > 0 ? input.points : [{ text: '', done: false }],
            color: input.color,
            x: input.x,
            y: input.y,
            rotation: input.rotation,
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
    patch: Partial<Pick<Note, 'points' | 'color' | 'x' | 'y'>>
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

// Notes that were just created and still need to glide to a parking slot.
const stagedNoteIds = new Set<number>()

/** Whether a note was created in this session and has not been parked yet. */
export function isStagedNote(id: number): boolean {
    return stagedNoteIds.has(id)
}

/** True exactly once for a freshly created note, when it should be parked. */
export function consumeStagedNote(id: number): boolean {
    return stagedNoteIds.delete(id)
}

/**
 * Create a new note at the centre of the viewport and focus it.
 *
 * `stage` marks the note for the desktop board's parking glide; the mobile
 * card stack has no free positioning, so it passes `stage: false`.
 */
export async function createNote({ stage = true }: { stage?: boolean } = {}): Promise<number | undefined> {
    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
    const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
    const seed = Date.now()
    const { x, y } = noteStagePosition(viewportWidth, viewportHeight)

    const id = await addNote({
        color: pickNoteColor(seed),
        x,
        y,
        rotation: noteRotation(seed),
    })
    if (typeof id === 'number') {
        if (stage) stagedNoteIds.add(id)
        appState.composeNoteId = id
    }
    return id
}
