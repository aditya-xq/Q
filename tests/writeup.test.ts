import { describe, expect, test } from 'bun:test'
import { WRITEUP_TITLE_FALLBACK, deriveWriteupTitle, toWriteupSummary } from '$lib/utils/writeup'
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
