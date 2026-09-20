export const NOTE_COLORS = ['amber', 'rose', 'sky', 'emerald', 'violet', 'orange'] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export const NOTE_WIDTH = 236
export const NOTE_HEIGHT = 148

const VIEWPORT_MARGIN = 12
const CASCADE_STEP = 28
const CASCADE_WRAP = 7

/** Keep a note fully inside the viewport with a small margin. */
export function clampToViewport(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT,
    margin = VIEWPORT_MARGIN
): { x: number; y: number } {
    const maxX = Math.max(margin, viewportWidth - width - margin)
    const maxY = Math.max(margin, viewportHeight - height - margin)
    return {
        x: Math.min(Math.max(x, margin), maxX),
        y: Math.min(Math.max(y, margin), maxY),
    }
}

/** Cascade new notes outward from the centre so they do not stack exactly. */
export function nextNotePosition(
    index: number,
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT
): { x: number; y: number } {
    const step = index % CASCADE_WRAP
    const baseX = (viewportWidth - width) / 2
    const baseY = (viewportHeight - height) / 2
    return clampToViewport(
        baseX + step * CASCADE_STEP,
        baseY + step * CASCADE_STEP,
        viewportWidth,
        viewportHeight,
        width,
        height
    )
}

/** Deterministic colour per seed so a note keeps its look across reloads. */
export function pickNoteColor(seed: number): NoteColor {
    const normalized = Math.abs(Math.trunc(seed))
    return NOTE_COLORS[normalized % NOTE_COLORS.length]
}

/**
 * Pick the first cascading slot that does not overlap an existing note, so a
 * new note never lands exactly on top of an old one (including after deletes).
 */
export function nextFreeNotePosition(
    occupied: readonly { x: number; y: number }[],
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT
): { x: number; y: number } {
    const tolerance = CASCADE_STEP / 2
    for (let index = 0; index < CASCADE_WRAP * 4; index++) {
        const candidate = nextNotePosition(index, viewportWidth, viewportHeight, width, height)
        const collides = occupied.some(
            (note) => Math.abs(note.x - candidate.x) < tolerance && Math.abs(note.y - candidate.y) < tolerance
        )
        if (!collides) return candidate
    }
    return nextNotePosition(occupied.length, viewportWidth, viewportHeight, width, height)
}

/** Deterministic slight tilt in degrees (-3..3). */
export function noteRotation(seed: number): number {
    return (Math.abs(Math.trunc(seed)) % 7) - 3
}
