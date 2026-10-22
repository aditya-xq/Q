import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import {
    DEFAULT_QUICK_LINKS,
    FALLBACK_ICON,
    LINK_ICONS,
    extractNameFromUrl,
    getFaviconUrl,
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
    test('returns the bundled icon for known names', () => {
        expect(getQuickLinkIcon('Gmail', 'https://anything')).toBe(LINK_ICONS.Gmail)
        expect(LINK_ICONS.Gmail).toMatch(/^\/icons\/brands\//)
    })

    test('ships every curated icon from the local brand folder', () => {
        for (const icon of Object.values(LINK_ICONS)) {
            expect(icon).toMatch(/^\/icons\/brands\/.+\.(ico|png|svg)$/)
        }
    })

    test('falls back to a Google favicon for unknown hosts', () => {
        expect(getQuickLinkIcon('Unknown', 'https://foo.com/bar')).toBe(
            'https://www.google.com/s2/favicons?domain=foo.com&sz=64'
        )
    })

    test('normalizes scheme-less hosts', () => {
        expect(getQuickLinkIcon('Unknown', 'foo.com')).toBe('https://www.google.com/s2/favicons?domain=foo.com&sz=64')
    })

    test('uses the placeholder for unparseable urls', () => {
        expect(getQuickLinkIcon('Unknown', 'bad url')).toBe(FALLBACK_ICON)
    })
})

describe('brand icons', () => {
    test('every curated icon and the placeholder exist in static/', () => {
        for (const icon of [...Object.values(LINK_ICONS), FALLBACK_ICON]) {
            expect(existsSync(new URL(`../static${icon}`, import.meta.url))).toBe(true)
        }
    })
})

describe('getFaviconUrl', () => {
    test('builds a domain favicon url and strips the path', () => {
        expect(getFaviconUrl('https://mail.google.com/mail/u/0/')).toBe(
            'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'
        )
    })

    test('accepts scheme-less urls', () => {
        expect(getFaviconUrl('web.whatsapp.com')).toBe(
            'https://www.google.com/s2/favicons?domain=web.whatsapp.com&sz=64'
        )
    })

    test('returns the local placeholder when the url cannot be parsed', () => {
        expect(getFaviconUrl('')).toBe(FALLBACK_ICON)
        expect(FALLBACK_ICON).toBe('/icons/brands/link.svg')
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
