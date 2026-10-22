import { describe, expect, test } from 'bun:test'
import type { QuickLink } from '$lib/utils/db'
import { DEFAULT_QUICK_LINKS } from '$lib/utils/constants'
import { QUICK_LINK_SHORTCUTS, findQuickLinkForShortcut, getShortcutCategory } from '$lib/utils/shortcuts'

const links: QuickLink[] = [
    { category: 'Email', name: 'Outlook', url: 'https://outlook.live.com' },
    { category: 'AI', name: 'Claude', url: 'https://claude.ai' },
    { category: 'Custom', name: 'Docs', url: 'https://docs.example.com' },
]

describe('QUICK_LINK_SHORTCUTS', () => {
    test('binds one distinct letter per category', () => {
        const keys = Object.values(QUICK_LINK_SHORTCUTS)
        expect(new Set(keys).size).toBe(keys.length)
        expect(keys).toEqual(['e', 'm', 'o', 'a', 's', 'c'])
    })
})

describe('getShortcutCategory', () => {
    test('maps each letter to its category', () => {
        expect(getShortcutCategory('e')).toBe('Email')
        expect(getShortcutCategory('m')).toBe('Messaging')
        expect(getShortcutCategory('o')).toBe('OTT')
        expect(getShortcutCategory('a')).toBe('AI')
        expect(getShortcutCategory('s')).toBe('Social')
        expect(getShortcutCategory('c')).toBe('Custom')
    })

    test('is case-insensitive', () => {
        expect(getShortcutCategory('E')).toBe('Email')
        expect(getShortcutCategory('S')).toBe('Social')
    })

    test('ignores keys that are not shortcuts', () => {
        expect(getShortcutCategory('x')).toBeUndefined()
        expect(getShortcutCategory('Enter')).toBeUndefined()
        expect(getShortcutCategory('')).toBeUndefined()
    })
})

describe('findQuickLinkForShortcut', () => {
    test('returns the configured link for the pressed category', () => {
        expect(findQuickLinkForShortcut(links, 'e')?.url).toBe('https://outlook.live.com')
        expect(findQuickLinkForShortcut(links, 'A')?.name).toBe('Claude')
        expect(findQuickLinkForShortcut(links, 'c')?.url).toBe('https://docs.example.com')
    })

    test('returns undefined for unmapped keys or empty categories', () => {
        expect(findQuickLinkForShortcut(links, 'z')).toBeUndefined()
        expect(findQuickLinkForShortcut(links, 'm')).toBeUndefined()
        expect(findQuickLinkForShortcut([], 'e')).toBeUndefined()
    })

    test('works against the shipped defaults', () => {
        expect(findQuickLinkForShortcut(DEFAULT_QUICK_LINKS, 'm')?.name).toBe('WhatsApp')
        expect(findQuickLinkForShortcut(DEFAULT_QUICK_LINKS, 'o')?.name).toBe('Netflix')
        expect(findQuickLinkForShortcut(DEFAULT_QUICK_LINKS, 's')?.name).toBe('X')
    })
})
