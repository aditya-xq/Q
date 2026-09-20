import { describe, expect, test } from 'bun:test'
import {
    DEFAULT_QUICK_LINKS,
    FAVICON_FALLBACK,
    LINK_ICONS,
    extractNameFromUrl,
    getQuickLinkIcon,
    normalizeUrl,
} from '$lib/utils/constants'

describe('normalizeUrl', () => {
    test('returns the trimmed value for empty input', () => {
        expect(normalizeUrl('')).toBe('')
        expect(normalizeUrl('   ')).toBe('')
    })

    test('keeps existing http(s) schemes', () => {
        expect(normalizeUrl('https://example.com')).toBe('https://example.com')
        expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    })

    test('prepends https:// when missing', () => {
        expect(normalizeUrl('example.com')).toBe('https://example.com')
        expect(normalizeUrl('  example.com  ')).toBe('https://example.com')
    })
})

describe('extractNameFromUrl', () => {
    test('derives a title-cased name from the hostname', () => {
        expect(extractNameFromUrl('https://github.com')).toBe('Github')
        expect(extractNameFromUrl('github.com')).toBe('Github')
        expect(extractNameFromUrl('https://www.example.com/path')).toBe('Example')
    })

    test('handles multi-part domains', () => {
        expect(extractNameFromUrl('https://sub.example.co.uk')).toBe('Co')
    })

    test('falls back for empty or invalid input', () => {
        expect(extractNameFromUrl('')).toBe('Custom Link')
        expect(extractNameFromUrl('not a url with spaces')).toBe('Custom Link')
    })
})

describe('getQuickLinkIcon', () => {
    test('returns the curated icon for known names', () => {
        expect(getQuickLinkIcon('Gmail', 'https://anything')).toBe(LINK_ICONS.Gmail)
    })

    test('falls back to a Google favicon for unknown hosts', () => {
        expect(getQuickLinkIcon('Unknown', 'https://foo.com/bar')).toBe(
            'https://www.google.com/s2/favicons?domain=foo.com&sz=32'
        )
    })

    test('normalizes scheme-less hosts', () => {
        expect(getQuickLinkIcon('Unknown', 'foo.com')).toBe('https://www.google.com/s2/favicons?domain=foo.com&sz=32')
    })

    test('uses the fallback favicon for unparseable urls', () => {
        expect(getQuickLinkIcon('Unknown', 'bad url')).toBe(FAVICON_FALLBACK)
    })
})

describe('defaults', () => {
    test('every default quick link has a category, name and url', () => {
        expect(DEFAULT_QUICK_LINKS.length).toBeGreaterThan(0)
        for (const link of DEFAULT_QUICK_LINKS) {
            expect(link.category).toBeTruthy()
            expect(link.name).toBeTruthy()
            expect(link.url).toMatch(/^https?:\/\//)
        }
    })
})
