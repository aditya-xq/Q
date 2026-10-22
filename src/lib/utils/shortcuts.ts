import type { QuickLink } from './db'
import { QUICK_LINK_CATEGORIES, normalizeUrl, type QuickLinkCategory } from './constants'

/** Single-letter shortcuts, one per quick-link category. */
export const QUICK_LINK_SHORTCUTS: Record<QuickLinkCategory, string> = {
    Email: 'e',
    Messaging: 'm',
    OTT: 'o',
    AI: 'a',
    Social: 's',
    Custom: 'c',
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

// Dialogs and panels (settings, mobile drawers) own the keyboard while they are open.
const BLOCKER_SELECTOR = '[role="dialog"], [data-shortcut-blocker]'

/** The category a key press maps to, ignoring case. */
export function getShortcutCategory(key: string): QuickLinkCategory | undefined {
    const pressed = key.toLowerCase()
    return QUICK_LINK_CATEGORIES.find((category) => QUICK_LINK_SHORTCUTS[category] === pressed)
}

/** The configured link a key press should open, if that category has one. */
export function findQuickLinkForShortcut(links: QuickLink[], key: string): QuickLink | undefined {
    const category = getShortcutCategory(key)
    if (!category) return undefined
    return links.find((link) => link.category === category)
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
