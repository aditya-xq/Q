import { describe, expect, test } from 'bun:test'
import type { QuickLink } from '$lib/utils/db'
import { DEFAULT_QUICK_LINKS } from '$lib/utils/constants'
import {
    buildQuickLinkShortcutIndex,
    findQuickLinkForSequence,
    getQuickLinkShortcutLetter,
    resolveQuickLinkShortcuts,
} from '$lib/utils/shortcuts'

const links: QuickLink[] = [
    { category: 'Email', name: 'Outlook', url: 'https://outlook.live.com' },
    { category: 'AI', name: 'Claude', url: 'https://claude.ai' },
    { category: 'Custom', name: 'Docs', url: 'https://docs.example.com' },
]

describe('getQuickLinkShortcutLetter', () => {
    test('uses the first letter of the name, case-insensitively', () => {
        expect(getQuickLinkShortcutLetter('Netflix')).toBe('n')
        expect(getQuickLinkShortcutLetter('spotify')).toBe('s')
        expect(getQuickLinkShortcutLetter('X')).toBe('x')
    })

    test('skips leading non-letters', () => {
        expect(getQuickLinkShortcutLetter('1Password')).toBe('p')
        expect(getQuickLinkShortcutLetter('🔗 GitHub')).toBe('g')
    })

    test('returns undefined when the name has no letters', () => {
        expect(getQuickLinkShortcutLetter('42')).toBeUndefined()
        expect(getQuickLinkShortcutLetter('')).toBeUndefined()
    })
})

describe('resolveQuickLinkShortcuts', () => {
    test('binds each link to the first letter of its name', () => {
        const shortcuts = resolveQuickLinkShortcuts(links)
        expect(shortcuts.get(links[0])).toBe('o')
        expect(shortcuts.get(links[1])).toBe('c')
        expect(shortcuts.get(links[2])).toBe('d')
    })

    test('suffixes later links that share a letter', () => {
        const contested: QuickLink[] = [
            { category: 'OTT', name: 'Techflix', url: 'https://techflix.club' },
            { category: 'Custom', name: 'Trello', url: 'https://trello.com' },
        ]
        const shortcuts = resolveQuickLinkShortcuts(contested)
        expect(shortcuts.get(contested[0])).toBe('t')
        expect(shortcuts.get(contested[1])).toBe('t1')
    })

    test('numbers three claimants in order', () => {
        const three: QuickLink[] = [
            { id: 1, category: 'OTT', name: 'Techflix', url: 'https://techflix.club' },
            { id: 2, category: 'AI', name: 'Trello', url: 'https://trello.com' },
            { id: 3, category: 'Custom', name: 'Tumblr', url: 'https://tumblr.com' },
        ]
        const shortcuts = resolveQuickLinkShortcuts(three)
        expect(shortcuts.get(three[0])).toBe('t')
        expect(shortcuts.get(three[1])).toBe('t1')
        expect(shortcuts.get(three[2])).toBe('t2')
    })

    test('lets the earliest configured link keep the bare letter', () => {
        const stored: QuickLink[] = [
            { id: 2, category: 'OTT', name: 'Trello', url: 'https://trello.com' },
            { id: 1, category: 'Custom', name: 'Techflix', url: 'https://techflix.club' },
        ]
        const shortcuts = resolveQuickLinkShortcuts(stored)
        expect(shortcuts.get(stored[1])).toBe('t')
        expect(shortcuts.get(stored[0])).toBe('t1')
    })

    test('ranks defaults ahead of stored rows', () => {
        const mixed: QuickLink[] = [
            { id: 5, category: 'OTT', name: 'Trello', url: 'https://trello.com' },
            { category: 'Custom', name: 'Techflix', url: 'https://techflix.club' },
        ]
        const shortcuts = resolveQuickLinkShortcuts(mixed)
        expect(shortcuts.get(mixed[1])).toBe('t')
        expect(shortcuts.get(mixed[0])).toBe('t1')
    })

    test('skips links whose name has no letters', () => {
        const withUnlettered: QuickLink[] = [
            { category: 'Custom', name: '42', url: 'https://example.com' },
            { category: 'OTT', name: 'Trello', url: 'https://trello.com' },
        ]
        const shortcuts = resolveQuickLinkShortcuts(withUnlettered)
        expect(shortcuts.get(withUnlettered[0])).toBeUndefined()
        expect(shortcuts.get(withUnlettered[1])).toBe('t')
    })
})

describe('findQuickLinkForSequence', () => {
    test('returns the link bound to a complete sequence', () => {
        expect(findQuickLinkForSequence(links, 'o')?.url).toBe('https://outlook.live.com')
        expect(findQuickLinkForSequence(links, 'C')?.name).toBe('Claude')
        expect(findQuickLinkForSequence(links, 'd')?.url).toBe('https://docs.example.com')
    })

    test('resolves numbered collisions', () => {
        const contested: QuickLink[] = [
            { category: 'OTT', name: 'Techflix', url: 'https://techflix.club' },
            { category: 'Custom', name: 'Trello', url: 'https://trello.com' },
        ]
        expect(findQuickLinkForSequence(contested, 't')?.name).toBe('Techflix')
        expect(findQuickLinkForSequence(contested, 'T1')?.name).toBe('Trello')
    })

    test('returns undefined for unknown sequences', () => {
        expect(findQuickLinkForSequence(links, 'z')).toBeUndefined()
        expect(findQuickLinkForSequence(links, 't2')).toBeUndefined()
        expect(findQuickLinkForSequence([], 'o')).toBeUndefined()
    })

    test('works against the shipped defaults', () => {
        expect(findQuickLinkForSequence(DEFAULT_QUICK_LINKS, 'g')?.name).toBe('Gmail')
        expect(findQuickLinkForSequence(DEFAULT_QUICK_LINKS, 'w')?.name).toBe('WhatsApp')
        expect(findQuickLinkForSequence(DEFAULT_QUICK_LINKS, 'n')?.name).toBe('Netflix')
        expect(findQuickLinkForSequence(DEFAULT_QUICK_LINKS, 'x')?.name).toBe('X')
        expect(findQuickLinkForSequence(DEFAULT_QUICK_LINKS, 't')?.name).toBe('Techflix')
    })
})

describe('buildQuickLinkShortcutIndex', () => {
    test('indexes sequences and flags ambiguous prefixes', () => {
        const contested: QuickLink[] = [
            { category: 'OTT', name: 'Techflix', url: 'https://techflix.club' },
            { category: 'Custom', name: 'Trello', url: 'https://trello.com' },
        ]
        const index = buildQuickLinkShortcutIndex(contested)
        expect(index.bySequence.get('t')?.name).toBe('Techflix')
        expect(index.bySequence.get('t1')?.name).toBe('Trello')
        expect(index.ambiguousPrefixes.has('t')).toBe(true)
        expect(index.ambiguousPrefixes.has('g')).toBe(false)
    })

    test('leaves unique prefixes unambiguous', () => {
        const index = buildQuickLinkShortcutIndex(links)
        expect(index.bySequence.get('o')?.name).toBe('Outlook')
        expect(index.ambiguousPrefixes.size).toBe(0)
    })
})
