export const NOTE_COLORS = [
    'amber',
    'orange',
    'rose',
    'violet',
    'indigo',
    'sky',
    'teal',
    'emerald',
    'lime',
    'slate',
] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export const NOTE_WIDTH = 236
export const NOTE_HEIGHT = 148

const VIEWPORT_MARGIN = 12
const SLOT_GAP = 20

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

/** Where a brand-new note appears so the user can type straight away. */
export function noteStagePosition(
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT
): { x: number; y: number } {
    return clampToViewport(
        (viewportWidth - width) / 2,
        (viewportHeight - height) / 2,
        viewportWidth,
        viewportHeight,
        width,
        height
    )
}

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

const RAIL_INSET = 76
const EDGE_INSET = 16
const TOP_INSET = 56
const BOTTOM_INSET = 12

/** A tidy parking grid in the free margins (row-major order). */
export function noteSlots(
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT
): { x: number; y: number }[] {
    const side = viewportWidth >= 768 ? RAIL_INSET : EDGE_INSET
    const areaX = side
    const areaY = TOP_INSET
    const areaWidth = Math.max(width, viewportWidth - side * 2)
    const areaHeight = Math.max(height, viewportHeight - TOP_INSET - BOTTOM_INSET)
    const cols = Math.max(1, Math.floor((areaWidth + SLOT_GAP) / (width + SLOT_GAP)))
    const rows = Math.max(1, Math.floor((areaHeight + SLOT_GAP) / (height + SLOT_GAP)))
    const gridWidth = cols * width + (cols - 1) * SLOT_GAP
    const gridHeight = rows * height + (rows - 1) * SLOT_GAP
    const originX = areaX + (areaWidth - gridWidth) / 2
    const originY = areaY + (areaHeight - gridHeight) / 2

    const slots: { x: number; y: number }[] = []
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            slots.push({ x: originX + col * (width + SLOT_GAP), y: originY + row * (height + SLOT_GAP) })
        }
    }
    return slots
}

/** Bounding box of every reserved area, used to decide which rows are clear. */
function unionRect(rects: readonly Rect[]): Rect | null {
    if (rects.length === 0) return null
    let left = Number.POSITIVE_INFINITY
    let top = Number.POSITIVE_INFINITY
    let right = Number.NEGATIVE_INFINITY
    let bottom = Number.NEGATIVE_INFINITY
    for (const rect of rects) {
        left = Math.min(left, rect.x)
        top = Math.min(top, rect.y)
        right = Math.max(right, rect.x + rect.width)
        bottom = Math.max(bottom, rect.y + rect.height)
    }
    return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Ranks a slot: rows below the content first, then above, then beside it. */
function slotRank(
    slot: { x: number; y: number },
    content: Rect | null,
    centerX: number,
    centerY: number,
    width: number,
    height: number
): [number, number, number] {
    const horizontal = Math.abs(slot.x + width / 2 - centerX)
    if (!content) {
        const below = slot.y + height / 2 >= centerY ? 0 : 1
        return [below, Math.abs(slot.y + height / 2 - centerY), horizontal]
    }
    if (slot.y >= content.y + content.height + SLOT_GAP) return [0, slot.y, horizontal]
    if (slot.y + height <= content.y - SLOT_GAP) return [1, -slot.y, horizontal]
    return [2, Math.abs(slot.y + height / 2 - centerY), horizontal]
}

/** Deterministic colour per seed so a note keeps its look across reloads. */
export function pickNoteColor(seed: number): NoteColor {
    const normalized = Math.abs(Math.trunc(seed))
    return NOTE_COLORS[normalized % NOTE_COLORS.length]
}

function overlapsRect(
    slot: { x: number; y: number },
    rect: Rect,
    width: number,
    height: number,
    padding = 12
): boolean {
    return (
        slot.x < rect.x + rect.width + padding &&
        slot.x + width + padding > rect.x &&
        slot.y < rect.y + rect.height + padding &&
        slot.y + height + padding > rect.y
    )
}

/**
 * First parking slot that overlaps neither a reserved area (the home content)
 * nor an existing note, so a finished note lands somewhere clear.
 */
export function nextFreeNoteSlot(
    occupied: readonly { x: number; y: number }[],
    obstacles: readonly Rect[],
    viewportWidth: number,
    viewportHeight: number,
    width = NOTE_WIDTH,
    height = NOTE_HEIGHT
): { x: number; y: number } {
    const content = unionRect(obstacles)
    const centerX = viewportWidth / 2
    const centerY = viewportHeight / 2
    const toleranceX = width + SLOT_GAP / 2
    const toleranceY = height + SLOT_GAP / 2
    const ranked = noteSlots(viewportWidth, viewportHeight, width, height)
        .slice()
        .sort((a, b) => {
            const rankA = slotRank(a, content, centerX, centerY, width, height)
            const rankB = slotRank(b, content, centerX, centerY, width, height)
            return rankA[0] - rankB[0] || rankA[1] - rankB[1] || rankA[2] - rankB[2]
        })

    for (const slot of ranked) {
        if (obstacles.some((rect) => overlapsRect(slot, rect, width, height))) continue
        const collides = occupied.some(
            (note) => Math.abs(note.x - slot.x) < toleranceX && Math.abs(note.y - slot.y) < toleranceY
        )
        if (!collides) return slot
    }
    return noteStagePosition(viewportWidth, viewportHeight, width, height)
}

/** Deterministic slight tilt in degrees (-2..2). */
export function noteRotation(seed: number): number {
    return (Math.abs(Math.trunc(seed)) % 5) - 2
}

export interface PointLike {
    text: string
    done: boolean
}

/** Split a legacy single-text note into points that share the note's `done` flag. */
export function splitNoteText(text: string | undefined, done: boolean): PointLike[] {
    const lines = typeof text === 'string' && text.length > 0 ? text.split('\n') : ['']
    return lines.map((line) => ({ text: line, done }))
}

/** Trim every point and drop blanks, preserving order and done flags. */
export function cleanPoints(points: readonly PointLike[]): PointLike[] {
    return points
        .map((point) => ({ text: point.text.trim(), done: point.done }))
        .filter((point) => point.text.length > 0)
}

/** True when at least one point has non-whitespace text. */
export function hasPointContent(points: readonly { text: string }[]): boolean {
    return points.some((point) => point.text.trim().length > 0)
}
