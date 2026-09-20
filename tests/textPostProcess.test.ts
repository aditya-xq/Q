import { describe, expect, test } from 'bun:test'
import {
    isPunctuationOnlyVoiceSegment,
    isStructuralVoiceSegment,
    mergeVoiceSegment,
    normalizeVoiceText,
} from '$lib/features/voice/textPostProcess'

describe('normalizeVoiceText', () => {
    test('returns empty string for empty input', () => {
        expect(normalizeVoiceText('', true)).toBe('')
        expect(normalizeVoiceText('', false)).toBe('')
    })

    test('replaces spoken punctuation when autoPunctuation is on', () => {
        expect(normalizeVoiceText('hello comma world', true)).toBe('hello, world')
        expect(normalizeVoiceText('stop period', true)).toBe('stop.')
        expect(normalizeVoiceText('really question mark', true)).toBe('really?')
    })

    test('leaves spoken punctuation intact when autoPunctuation is off', () => {
        expect(normalizeVoiceText('hello comma world', false)).toBe('hello comma world')
    })

    test('converts structural commands into line breaks', () => {
        expect(normalizeVoiceText('hello new paragraph world', true)).toBe('hello\n\nworld')
        expect(normalizeVoiceText('first new line second', true)).toBe('first\nsecond')
    })

    test('converts markdown heading and list commands', () => {
        expect(normalizeVoiceText('heading one title', true)).toBe('# title')
        expect(normalizeVoiceText('bullet point item', true)).toBe('- item')
        expect(normalizeVoiceText('task item buy milk', true)).toBe('- [ ] buy milk')
    })

    test('applies inline formatting commands', () => {
        expect(normalizeVoiceText('make this bold hello world end bold', true)).toBe('make this **hello world**')
        expect(normalizeVoiceText('italic soft words end italic', true)).toBe('*soft words*')
    })

    test('normalizes whitespace and collapses newlines', () => {
        expect(normalizeVoiceText('a   b', true)).toBe('a b')
        expect(normalizeVoiceText('a\n\n\n\nb', true)).toBe('a\n\nb')
        expect(normalizeVoiceText('  leading and trailing  ', true)).toBe('leading and trailing')
    })
})

describe('mergeVoiceSegment', () => {
    test('returns the segment when there is no prior text', () => {
        expect(mergeVoiceSegment('', 'hello')).toBe('hello')
    })

    test('does not dedupe short overlaps', () => {
        expect(mergeVoiceSegment('hello world', 'world again')).toBe('world again')
    })

    test('dedupes a long repeated tail at a word boundary', () => {
        expect(mergeVoiceSegment('the quick brown fox jumps', 'the quick brown fox jumps over')).toBe('over')
    })
})

describe('isPunctuationOnlyVoiceSegment', () => {
    test('detects punctuation-only segments', () => {
        expect(isPunctuationOnlyVoiceSegment(',')).toBe(true)
        expect(isPunctuationOnlyVoiceSegment(' ... ')).toBe(true)
        expect(isPunctuationOnlyVoiceSegment('')).toBe(false)
        expect(isPunctuationOnlyVoiceSegment('a.')).toBe(false)
        expect(isPunctuationOnlyVoiceSegment('hello')).toBe(false)
    })
})

describe('isStructuralVoiceSegment', () => {
    test('detects structural markdown fragments', () => {
        expect(isStructuralVoiceSegment('\n')).toBe(true)
        expect(isStructuralVoiceSegment('\n\n')).toBe(true)
        expect(isStructuralVoiceSegment('#')).toBe(true)
        expect(isStructuralVoiceSegment('######')).toBe(true)
        expect(isStructuralVoiceSegment('#######')).toBe(false)
        expect(isStructuralVoiceSegment('-')).toBe(true)
        expect(isStructuralVoiceSegment('- [ ]')).toBe(true)
        expect(isStructuralVoiceSegment('- [x]')).toBe(true)
        expect(isStructuralVoiceSegment('1.')).toBe(true)
        expect(isStructuralVoiceSegment('```')).toBe(true)
        expect(isStructuralVoiceSegment('---')).toBe(true)
        expect(isStructuralVoiceSegment('|')).toBe(true)
    })

    test('rejects ordinary prose and empty input', () => {
        expect(isStructuralVoiceSegment('')).toBe(false)
        expect(isStructuralVoiceSegment('hello')).toBe(false)
    })
})
