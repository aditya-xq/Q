import { describe, expect, test } from 'bun:test'
import { QUOTE_ENTRIES } from '$lib/data/quotes'
import { createQuoteDeck, drawQuoteIndex, type QuoteDeck } from '$lib/utils/quotes'

const normalize = (text: string) =>
    text.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

function seeded(seed: number): () => number {
    let value = seed >>> 0
    return () => {
        value = (value * 1_664_525 + 1_013_904_223) >>> 0
        return value / 0x1_0000_0000
    }
}

describe('quote entries', () => {
    test('ships a sizeable list without duplicate texts', () => {
        expect(QUOTE_ENTRIES.length).toBeGreaterThan(100)

        const texts = QUOTE_ENTRIES.map((entry) => normalize(entry.text))
        expect(new Set(texts).size).toBe(texts.length)
    })

    test('every entry is short enough for the widget and carries a source', () => {
        for (const entry of QUOTE_ENTRIES) {
            expect(entry.text.trim().length).toBeGreaterThan(0)
            expect(entry.text.length).toBeLessThanOrEqual(260)
            expect(entry.source.trim().length).toBeGreaterThan(0)
            expect(entry.source.length).toBeLessThanOrEqual(60)
        }
    })

    test('quotes name an author and facts cite their source instead', () => {
        for (const entry of QUOTE_ENTRIES) {
            if (entry.kind === 'quote') {
                expect(entry.author?.trim().length ?? 0).toBeGreaterThan(0)
            } else {
                expect(entry.author).toBeUndefined()
            }
        }
    })

    test('covers both quotes and facts', () => {
        expect(QUOTE_ENTRIES.some((entry) => entry.kind === 'quote')).toBe(true)
        expect(QUOTE_ENTRIES.some((entry) => entry.kind === 'fact')).toBe(true)
    })
})

describe('quote deck', () => {
    test('builds a permutation of every index', () => {
        const deck = createQuoteDeck(10, seeded(1))
        expect(deck.cursor).toBe(0)
        expect([...deck.order].sort((a, b) => a - b)).toEqual(Array.from({ length: 10 }, (_, index) => index))
    })

    test('walks the whole deck before repeating an entry', () => {
        const random = seeded(2)
        let deck = createQuoteDeck(6, random)
        const seen: number[] = []

        for (let draw = 0; draw < 6; draw += 1) {
            const next = drawQuoteIndex(deck, 6, { random })
            seen.push(next.index)
            deck = next.deck
        }

        expect(new Set(seen).size).toBe(6)
        expect(deck.cursor).toBe(6)
    })

    test('reshuffles once the deck is exhausted', () => {
        const random = seeded(3)
        const deck: QuoteDeck = { order: [2, 0, 1], cursor: 3 }

        const next = drawQuoteIndex(deck, 3, { random })
        expect(next.index).toBeGreaterThanOrEqual(0)
        expect(next.index).toBeLessThan(3)
        expect(next.deck.cursor).toBe(1)
        expect(next.deck.order.length).toBe(3)
    })

    test('does not open a fresh cycle with the entry already shown', () => {
        // A constant RNG above 0.5 leaves the shuffled order as [0, 1], so without
        // the guard the new cycle would start with the entry just displayed.
        const random = () => 0.9
        const exhausted: QuoteDeck = { order: [1, 0], cursor: 2 }

        const next = drawQuoteIndex(exhausted, 2, { random, avoid: 0 })
        expect(next.index).toBe(1)
    })

    test('leaves a fresh cycle alone when its first entry differs', () => {
        const random = () => 0.9
        const exhausted: QuoteDeck = { order: [1, 0], cursor: 2 }

        const next = drawQuoteIndex(exhausted, 2, { random, avoid: 1 })
        expect(next.index).toBe(0)
    })

    test('rebuilds a deck built for a different list size', () => {
        const stale: QuoteDeck = { order: [0, 1, 2], cursor: 2 }

        const next = drawQuoteIndex(stale, 5, { random: seeded(4) })
        expect(next.deck.order.length).toBe(5)
        expect(next.deck.cursor).toBe(1)
        expect(next.index).toBeLessThan(5)
    })

    test('rejects an empty entry list', () => {
        expect(() => drawQuoteIndex(null, 0)).toThrow(RangeError)
    })

    test('stays in range when called without a deck', () => {
        const next = drawQuoteIndex(null, 4, { random: seeded(5) })
        expect(next.index).toBeGreaterThanOrEqual(0)
        expect(next.index).toBeLessThan(4)
    })
})
