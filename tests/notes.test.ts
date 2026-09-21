import { describe, expect, test } from 'bun:test'
import {
    clampToViewport,
    cleanPoints,
    hasPointContent,
    nextFreeNoteSlot,
    NOTE_COLORS,
    noteSlots,
    noteStagePosition,
    noteRotation,
    pickNoteColor,
    splitNoteText,
} from '$lib/utils/notes'

describe('clampToViewport', () => {
    test('pulls a note back inside the margins', () => {
        expect(clampToViewport(-50, -50, 1000, 800)).toEqual({ x: 12, y: 12 })
        expect(clampToViewport(5000, 5000, 1000, 800)).toEqual({ x: 1000 - 236 - 12, y: 800 - 148 - 12 })
    })

    test('falls back to the margin when the viewport is tiny', () => {
        expect(clampToViewport(500, 500, 100, 100)).toEqual({ x: 12, y: 12 })
    })
})

describe('noteStagePosition', () => {
    test('centres the note in the viewport', () => {
        expect(noteStagePosition(1000, 800)).toEqual({ x: (1000 - 236) / 2, y: (800 - 148) / 2 })
    })

    test('clamps inside a tiny viewport', () => {
        expect(noteStagePosition(100, 100)).toEqual({ x: 12, y: 12 })
    })
})

describe('noteSlots', () => {
    test('returns a grid inside the safe margins', () => {
        const slots = noteSlots(1000, 800)
        expect(slots.length).toBeGreaterThan(0)
        for (const slot of slots) {
            expect(slot.x).toBeGreaterThanOrEqual(76)
            expect(slot.y).toBeGreaterThanOrEqual(56)
            expect(slot.x + 236).toBeLessThanOrEqual(1000 - 76)
            expect(slot.y + 148).toBeLessThanOrEqual(800 - 12)
        }
    })
})

describe('nextFreeNoteSlot', () => {
    test('parks below the reserved content when there is room', () => {
        const content = { x: 300, y: 180, width: 400, height: 220 }
        const slot = nextFreeNoteSlot([], [content], 1000, 800)
        expect(slot.y).toBeGreaterThanOrEqual(content.y + content.height)
    })

    test('skips a slot occupied by an existing note', () => {
        const first = nextFreeNoteSlot([], [], 1000, 800)
        expect(nextFreeNoteSlot([first], [], 1000, 800)).not.toEqual(first)
    })

    test('falls back to the stage position when everything is blocked', () => {
        const occupied = noteSlots(1000, 800)
        expect(nextFreeNoteSlot(occupied, [], 1000, 800)).toEqual(noteStagePosition(1000, 800))
    })
})

describe('pickNoteColor', () => {
    test('is deterministic and always returns a palette colour', () => {
        for (let index = 0; index < 20; index++) {
            const color = pickNoteColor(index)
            expect(NOTE_COLORS).toContain(color)
            expect(pickNoteColor(index)).toBe(color)
        }
    })

    test('handles negative and fractional seeds', () => {
        expect(NOTE_COLORS).toContain(pickNoteColor(-3))
        expect(NOTE_COLORS).toContain(pickNoteColor(3.9))
    })
})

describe('noteRotation', () => {
    test('stays within the intended tilt range', () => {
        for (let index = 0; index < 30; index++) {
            const rotation = noteRotation(index)
            expect(rotation).toBeGreaterThanOrEqual(-2)
            expect(rotation).toBeLessThanOrEqual(2)
        }
    })
})

describe('splitNoteText', () => {
    test('splits legacy newline text into points sharing the done flag', () => {
        expect(splitNoteText('one\ntwo', true)).toEqual([
            { text: 'one', done: true },
            { text: 'two', done: true },
        ])
    })

    test('falls back to a single empty point for empty or missing text', () => {
        expect(splitNoteText('', false)).toEqual([{ text: '', done: false }])
        expect(splitNoteText(undefined, false)).toEqual([{ text: '', done: false }])
    })
})

describe('cleanPoints', () => {
    test('trims text and drops blanks while keeping order and done', () => {
        expect(
            cleanPoints([
                { text: '  one ', done: false },
                { text: '   ', done: true },
                { text: 'two', done: true },
            ])
        ).toEqual([
            { text: 'one', done: false },
            { text: 'two', done: true },
        ])
    })

    test('returns an empty list when every point is blank', () => {
        expect(cleanPoints([{ text: ' ', done: false }])).toEqual([])
    })
})

describe('hasPointContent', () => {
    test('ignores whitespace-only points', () => {
        expect(hasPointContent([{ text: '  ' }])).toBe(false)
        expect(hasPointContent([{ text: '  ' }, { text: 'x' }])).toBe(true)
    })
})
