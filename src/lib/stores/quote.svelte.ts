import { QUOTE_ENTRIES, type QuoteEntry } from '$lib/data/quotes'
import { drawQuoteIndex, type QuoteDeck } from '$lib/utils/quotes'

interface QuoteState {
    entry: QuoteEntry | null
}

export const quoteState = $state<QuoteState>({ entry: null })

let deck: QuoteDeck | null = null
let lastIndex = -1

/** Advances through a shuffled deck, so a new entry appears without repeats. */
export function showNextQuote() {
    const draw = drawQuoteIndex(deck, QUOTE_ENTRIES.length, { avoid: lastIndex })
    deck = draw.deck
    lastIndex = draw.index
    quoteState.entry = QUOTE_ENTRIES[draw.index]
}

/**
 * Called from the widget on mount. The store keeps the current entry, so
 * switching views and coming back shows the same quote instead of a new one.
 */
export function ensureQuoteEntry() {
    if (!quoteState.entry) showNextQuote()
}
