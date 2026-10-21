import { describe, expect, test } from 'bun:test'
import { WRITEUP_TITLE_FALLBACK, countWords, deriveWriteupTitle, toWriteupSummary } from '$lib/utils/writeup'
import type { Writeup } from '$lib/utils/db'

describe('deriveWriteupTitle', () => {
    test('derives a title from markdown content', () => {
        expect(deriveWriteupTitle('# Hello world')).toBe('Hello world')
        expect(deriveWriteupTitle('Plain first line')).toBe('Plain first line')
    })

    test('falls back for empty or non-text content', () => {
        expect(deriveWriteupTitle('')).toBe(WRITEUP_TITLE_FALLBACK)
        expect(deriveWriteupTitle('# ')).toBe(WRITEUP_TITLE_FALLBACK)
    })
})

describe('toWriteupSummary', () => {
    const updatedAt = new Date('2026-09-16T12:00:00')
    const base: Writeup = { id: 7, content: '# Stored', title: 'Stored title', updatedAt, createdAt: 1000 }

    test('projects the fields needed by the drafts panel', () => {
        expect(toWriteupSummary(base)).toEqual({
            id: 7,
            title: 'Stored title',
            updatedAt,
            createdAt: 1000,
        })
    })

    test('derives a title for records saved before titles existed', () => {
        const legacy = { ...base, title: '' }
        expect(toWriteupSummary(legacy).title).toBe('Stored')
    })

    test('drops the write-up body from the summary', () => {
        const summary = toWriteupSummary(base)
        expect('content' in summary).toBe(false)
    })
})

describe('countWords', () => {
    test('counts plain prose', () => {
        expect(countWords('Hello world')).toBe(2)
        expect(countWords('One')).toBe(1)
    })

    test('ignores markdown syntax, links and code', () => {
        expect(countWords('# Heading\n\nSome **bold** text with [a link](https://example.test).')).toBe(7)
        expect(countWords('Use `inline code` here')).toBe(2)
        expect(countWords('Intro\n\n```\nconst answer = 42\n```')).toBe(1)
    })

    test('counts numbers and hyphenated words once', () => {
        expect(countWords('Version 2 is well-known.')).toBe(4)
    })

    test('returns zero for empty drafts', () => {
        expect(countWords('')).toBe(0)
        expect(countWords('# ')).toBe(0)
    })
})
