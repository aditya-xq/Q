import { describe, expect, test } from 'bun:test'
import {
    clampToViewport,
    nextFreeNotePosition,
    NOTE_COLORS,
    nextNotePosition,
    noteRotation,
    pickNoteColor,
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

describe('nextNotePosition', () => {
    test('cascades successive notes by a fixed step', () => {
        const first = nextNotePosition(0, 1000, 800)
        const second = nextNotePosition(1, 1000, 800)
        expect(second.x - first.x).toBe(28)
        expect(second.y - first.y).toBe(28)
    })

    test('stays inside the viewport for a long run of notes', () => {
        for (let index = 0; index < 40; index++) {
            const { x, y } = nextNotePosition(index, 1000, 800)
            expect(x).toBeGreaterThanOrEqual(12)
            expect(y).toBeGreaterThanOrEqual(12)
            expect(x).toBeLessThanOrEqual(1000 - 236 - 12)
            expect(y).toBeLessThanOrEqual(800 - 148 - 12)
        }
    })
})

describe('nextFreeNotePosition', () => {
    test('returns the first cascade slot when nothing is occupied', () => {
        expect(nextFreeNotePosition([], 1000, 800)).toEqual(nextNotePosition(0, 1000, 800))
    })

    test('skips slots already occupied by another note', () => {
        const occupied = [nextNotePosition(0, 1000, 800)]
        expect(nextFreeNotePosition(occupied, 1000, 800)).toEqual(nextNotePosition(1, 1000, 800))
    })

    test('keeps advancing past several occupied slots', () => {
        const occupied = [0, 1, 2].map((index) => nextNotePosition(index, 1000, 800))
        expect(nextFreeNotePosition(occupied, 1000, 800)).toEqual(nextNotePosition(3, 1000, 800))
    })

    test('still returns a clamped position when every slot is occupied', () => {
        const occupied = Array.from({ length: 40 }, (_, index) => nextNotePosition(index, 1000, 800))
        const position = nextFreeNotePosition(occupied, 1000, 800)
        expect(position.x).toBeGreaterThanOrEqual(12)
        expect(position.y).toBeGreaterThanOrEqual(12)
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
            expect(rotation).toBeGreaterThanOrEqual(-3)
            expect(rotation).toBeLessThanOrEqual(3)
        }
    })
})
