import type { QuickLink } from './db'
import { normalizeUrl } from './constants'

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

// Dialogs and panels (settings, mobile drawers) own the keyboard while they are open.
const BLOCKER_SELECTOR = '[role="dialog"], [data-shortcut-blocker]'

/** How long a bare prefix waits for a digit suffix before it fires on its own. */
export const SHORTCUT_SEQUENCE_TIMEOUT_MS = 700

/** First ASCII letter in a link's display name, lowercased; undefined if none. */
export function getQuickLinkShortcutLetter(name: string): string | undefined {
    const match = name.match(/[a-z]/i)
    return match ? match[0].toLowerCase() : undefined
}

/**
 * Binds a key sequence to each quick link from the first letter of its name.
 * The earliest configured link keeps the bare letter; each later link sharing
 * it gets a digit suffix (`t`, `t1`, `t2`, …). Defaults (no id) sort before
 * stored rows, which sort by ascending id, so a newly configured link never
 * takes a letter an existing link already uses.
 */
export function resolveQuickLinkShortcuts(links: QuickLink[]): Map<QuickLink, string> {
    const shortcuts = new Map<QuickLink, string>()
    const counts = new Map<string, number>()
    const ordered = [...links].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    for (const link of ordered) {
        const letter = getQuickLinkShortcutLetter(link.name)
        if (!letter) continue
        const count = counts.get(letter) ?? 0
        counts.set(letter, count + 1)
        shortcuts.set(link, count === 0 ? letter : `${letter}${count}`)
    }
    return shortcuts
}

/** The link bound to a complete key sequence, e.g. "t" or "t1". */
export function findQuickLinkForSequence(links: QuickLink[], sequence: string): QuickLink | undefined {
    const pressed = sequence.toLowerCase()
    for (const [link, bound] of resolveQuickLinkShortcuts(links)) {
        if (bound === pressed) return link
    }
    return undefined
}

export interface QuickLinkShortcutIndex {
    bySequence: Map<string, QuickLink>
    /** Prefixes that have numbered alternatives, so a bare press must wait for a suffix. */
    ambiguousPrefixes: Set<string>
}

/** Reverse index of every bound sequence plus the prefixes that need a suffix. */
export function buildQuickLinkShortcutIndex(links: QuickLink[]): QuickLinkShortcutIndex {
    const bySequence = new Map<string, QuickLink>()
    const ambiguousPrefixes = new Set<string>()
    for (const [link, sequence] of resolveQuickLinkShortcuts(links)) {
        bySequence.set(sequence, link)
        if (sequence.length > 1) ambiguousPrefixes.add(sequence[0])
    }
    return { bySequence, ambiguousPrefixes }
}

/**
 * True when a bare letter must be ignored: the user is typing, an IME is composing,
 * a modifier combo is in flight, or a dialog/panel that owns the keyboard is open.
 */
export function isShortcutBlocked(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || event.repeat) return true
    if (event.altKey || event.ctrlKey || event.metaKey) return true

    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(EDITABLE_SELECTOR)) return true

    const active = document.activeElement
    if (active instanceof Element && active !== document.body && active.closest(EDITABLE_SELECTOR)) return true

    return Boolean(document.querySelector(BLOCKER_SELECTOR))
}

/** Navigates to a quick link in place, refusing anything that is not http(s). */
export function openQuickLink(url: string): boolean {
    if (typeof window === 'undefined') return false
    const normalized = normalizeUrl(url)
    if (!/^https?:\/\//i.test(normalized)) return false
    window.location.href = normalized
    return true
}
