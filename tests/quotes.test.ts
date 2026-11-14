import { describe, expect, test } from 'bun:test'
import { QUOTES, getRandomQuote } from '$lib/data/quotes'

describe('quotes', () => {
    test('ships a non-empty, unique list', () => {
        expect(QUOTES.length).toBeGreaterThan(0)
        expect(QUOTES.every((quote) => quote.text.trim().length > 0)).toBe(true)

        const texts = QUOTES.map((quote) => quote.text.trim().toLowerCase())
        expect(new Set(texts).size).toBe(texts.length)
    })

    test('returns an item from the list', () => {
        expect(QUOTES).toContain(getRandomQuote())
    })
})
