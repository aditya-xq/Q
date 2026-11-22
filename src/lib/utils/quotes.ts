export interface QuoteDeck {
    /** Shuffled indices into the entry list. */
    order: number[]
    /** Next position in `order`. */
    cursor: number
}

export interface QuoteDrawOptions {
    random?: () => number
    /** Index a freshly reshuffled cycle should not open with. */
    avoid?: number
}

/** Fisher-Yates shuffle; the random source is injectable so tests stay deterministic. */
export function createQuoteDeck(length: number, random: () => number = Math.random): QuoteDeck {
    const order = Array.from({ length }, (_, index) => index)
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
    }
    return { order, cursor: 0 }
}

/**
 * Draws the next entry index, reshuffling only once the whole deck has been seen.
 * The returned deck keeps the sequence repeat-free without needing storage, and
 * a deck built for a different list size is rebuilt so added entries still appear.
 */
export function drawQuoteIndex(
    deck: QuoteDeck | null,
    length: number,
    options: QuoteDrawOptions = {}
): { index: number; deck: QuoteDeck } {
    if (length <= 0) throw new RangeError('a quote deck needs at least one entry')

    const random = options.random ?? Math.random
    const avoid = options.avoid ?? -1
    let usable = deck && deck.order.length === length ? deck : createQuoteDeck(length, random)

    if (usable.cursor >= usable.order.length) {
        usable = createQuoteDeck(length, random)
        // Opening a new cycle with the entry already on screen would make the
        // next button look inert, so swap that entry out of the first slot.
        if (length > 1 && usable.order[0] === avoid) {
            const swap = 1 + Math.floor(random() * (length - 1))
            ;[usable.order[0], usable.order[swap]] = [usable.order[swap], usable.order[0]]
        }
    }

    return { index: usable.order[usable.cursor], deck: { order: usable.order, cursor: usable.cursor + 1 } }
}
