import { describe, expect, test } from 'bun:test'
import {
    formatAutosaveTime,
    formatRelative,
    isThisWeek,
    isToday,
    ordinal,
    startOfDay,
    startOfWeek,
} from '$lib/utils/datetime'

const NOW = new Date(2026, 8, 16, 12, 0, 0) // Wed 16 Sep 2026, midday local

describe('startOfDay / startOfWeek', () => {
    test('zeroes the time component', () => {
        const result = startOfDay(NOW)
        expect(result.getFullYear()).toBe(2026)
        expect(result.getMonth()).toBe(8)
        expect(result.getDate()).toBe(16)
        expect(result.getHours()).toBe(0)
        expect(result.getMinutes()).toBe(0)
        expect(result.getSeconds()).toBe(0)
        expect(result.getMilliseconds()).toBe(0)
    })

    test('startOfWeek returns the preceding Monday at midnight', () => {
        const week = startOfWeek(NOW)
        expect(week.getDay()).toBe(1)
        expect(week.getHours()).toBe(0)
        expect(week.getTime()).toBeLessThanOrEqual(NOW.getTime())
        expect(NOW.getTime() - week.getTime()).toBeLessThan(7 * 24 * 60 * 60 * 1000)
    })
})

describe('isToday', () => {
    test('accepts the same day and rejects the previous day', () => {
        expect(isToday(new Date(2026, 8, 16, 23, 59), NOW)).toBe(true)
        expect(isToday(new Date(2026, 8, 15, 23, 59, 59, 999), NOW)).toBe(false)
    })

    test('accepts future dates (documented behavior)', () => {
        expect(isToday(new Date(2026, 8, 17), NOW)).toBe(true)
    })
})

describe('isThisWeek', () => {
    test('accepts the start of the week and rejects the day before', () => {
        const monday = startOfWeek(NOW)
        expect(isThisWeek(monday, NOW)).toBe(true)
        expect(isThisWeek(new Date(monday.getTime() - 1), NOW)).toBe(false)
    })
})

describe('formatRelative', () => {
    test('formats recent timestamps', () => {
        expect(formatRelative(new Date(NOW.getTime() - 30 * 1000), NOW)).toBe('Just now')
        expect(formatRelative(new Date(NOW.getTime() - 5 * 60 * 1000), NOW)).toBe('5m ago')
        expect(formatRelative(new Date(NOW.getTime() - 2 * 60 * 60 * 1000), NOW)).toBe('2h ago')
    })

    test('formats older timestamps as a localized date', () => {
        const older = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000)
        expect(formatRelative(older, NOW)).toBe(older.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
    })

    test('treats future timestamps as just now', () => {
        expect(formatRelative(new Date(NOW.getTime() + 1000), NOW)).toBe('Just now')
    })
})

describe('ordinal', () => {
    test('adds the correct English suffix', () => {
        expect(ordinal(1)).toBe('1st')
        expect(ordinal(2)).toBe('2nd')
        expect(ordinal(3)).toBe('3rd')
        expect(ordinal(4)).toBe('4th')
        expect(ordinal(11)).toBe('11th')
        expect(ordinal(12)).toBe('12th')
        expect(ordinal(13)).toBe('13th')
        expect(ordinal(21)).toBe('21st')
        expect(ordinal(22)).toBe('22nd')
        expect(ordinal(23)).toBe('23rd')
        expect(ordinal(101)).toBe('101st')
        expect(ordinal(111)).toBe('111th')
        expect(ordinal(112)).toBe('112th')
    })
})

describe('formatAutosaveTime', () => {
    test('returns empty string for null', () => {
        expect(formatAutosaveTime(null)).toBe('')
    })

    test('includes the ordinal day and year', () => {
        const result = formatAutosaveTime(new Date(2026, 8, 7, 14, 30))
        expect(result).toContain('7th')
        expect(result).toContain('2026')
    })
})
