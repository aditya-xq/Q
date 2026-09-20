import { describe, expect, test } from 'bun:test'
import { VALID_VIEWS, getViewFromUrl, parseViewParam } from '$lib/utils/view'

describe('parseViewParam', () => {
    test('defaults to home for missing values', () => {
        expect(parseViewParam(null)).toBe('home')
        expect(parseViewParam(undefined)).toBe('home')
        expect(parseViewParam('')).toBe('home')
    })

    test('accepts valid views case-insensitively', () => {
        expect(parseViewParam('home')).toBe('home')
        expect(parseViewParam('projects')).toBe('projects')
        expect(parseViewParam('PROJECTS')).toBe('projects')
        expect(parseViewParam('Quick-Panel')).toBe('quick-panel')
        expect(parseViewParam('writer')).toBe('writer')
    })

    test('falls back to home for unknown values', () => {
        expect(parseViewParam('does-not-exist')).toBe('home')
        expect(parseViewParam('settings')).toBe('home')
    })
})

describe('getViewFromUrl', () => {
    test('reads the view query parameter', () => {
        expect(getViewFromUrl(new URL('https://q.test/?view=writer'))).toBe('writer')
        expect(getViewFromUrl(new URL('https://q.test/?view=projects'))).toBe('projects')
    })

    test('falls back to home when absent or invalid', () => {
        expect(getViewFromUrl(new URL('https://q.test/'))).toBe('home')
        expect(getViewFromUrl(new URL('https://q.test/?view=bogus'))).toBe('home')
    })
})

describe('VALID_VIEWS', () => {
    test('contains exactly the supported views', () => {
        expect([...VALID_VIEWS].sort()).toEqual(['home', 'projects', 'quick-panel', 'writer'])
    })
})
