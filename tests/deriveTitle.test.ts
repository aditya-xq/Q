import { describe, expect, test } from 'bun:test'
import { deriveTitle } from '$lib/utils/utils'

describe('deriveTitle', () => {
    test('falls back for empty, blank, and non-text content', () => {
        expect(deriveTitle('')).toBe('Untitled')
        expect(deriveTitle('   ')).toBe('Untitled')
        expect(deriveTitle('\n\n\t')).toBe('Untitled')
        expect(deriveTitle('!!!')).toBe('Untitled')
        expect(deriveTitle('---')).toBe('Untitled')
        expect(deriveTitle('![alt](https://example.com/a.png)')).toBe('Untitled')
    })

    test('uses the first non-empty line', () => {
        expect(deriveTitle('Hello world')).toBe('Hello world')
        expect(deriveTitle('\n\nSecond line')).toBe('Second line')
        expect(deriveTitle('First block\n\nSecond block')).toBe('First block')
    })

    test('strips markdown heading, list, and quote markers', () => {
        expect(deriveTitle('# My title')).toBe('My title')
        expect(deriveTitle('###### Deep heading')).toBe('Deep heading')
        expect(deriveTitle('- item one')).toBe('item one')
        expect(deriveTitle('* star item')).toBe('star item')
        expect(deriveTitle('1. numbered')).toBe('numbered')
        expect(deriveTitle('> quoted')).toBe('quoted')
    })

    test('strips YAML frontmatter', () => {
        const md = ['---', 'title: Foo', 'tags: [a, b]', '---', 'Actual title'].join('\n')
        expect(deriveTitle(md)).toBe('Actual title')
    })

    test('removes images but keeps link text, code, and formatting', () => {
        expect(deriveTitle('[Read more](https://example.com)')).toBe('Read more')
        expect(deriveTitle('`code` here')).toBe('code here')
        expect(deriveTitle('**Bold** and *italic*')).toBe('Bold and italic')
        expect(deriveTitle('~~struck~~ text')).toBe('struck text')
        expect(deriveTitle('<b>Tagged</b>')).toBe('Tagged')
    })

    test('decodes common HTML entities', () => {
        expect(deriveTitle('Tom &amp; Jerry')).toBe('Tom & Jerry')
        expect(deriveTitle('a &lt; b &gt; c')).toBe('a < b > c')
        expect(deriveTitle('It&#39;s fine')).toBe("It's fine")
        expect(deriveTitle('a&nbsp;b')).toBe('a b')
    })

    test('removes naked URLs', () => {
        expect(deriveTitle('Check https://example.com now')).toBe('Check now')
    })

    test('captures the first sentence and trims trailing punctuation', () => {
        expect(deriveTitle('First sentence. Second sentence.')).toBe('First sentence')
        expect(deriveTitle('Is this a question? Then more text')).toBe('Is this a question')
    })

    test('truncates long titles preferring word boundaries', () => {
        const title = deriveTitle('The quick brown fox jumps over the lazy dog again and again')
        expect(title.length).toBeLessThanOrEqual(29)
        expect(title.endsWith('…')).toBe(true)
        expect(title).toBe('The quick brown fox jumps…')
    })

    test('hard-cuts when there is no usable word boundary', () => {
        expect(deriveTitle('Supercalifragilisticexpialidocious', { maxTitleLength: 10 })).toBe('Supercalif…')
    })

    test('respects custom options', () => {
        expect(deriveTitle('', { fallback: 'None' })).toBe('None')
        expect(deriveTitle('Hello wonderful world', { maxTitleLength: 5 })).toBe('Hello…')
        expect(deriveTitle('Keep it short', { maxTitleLength: 50 })).toBe('Keep it short')
    })
})
