import { describe, expect, test } from 'bun:test'
import {
    BLACK,
    WHITE,
    contrastRatio,
    desaturate,
    hslToRgb,
    isDark,
    luminance,
    mix,
    normalizeHex,
    parseHex,
    readableOn,
    rgbToHsl,
    toHex,
    withAlpha,
} from '$lib/utils/color'

describe('normalizeHex', () => {
    test('accepts three- and six-digit hex with or without a hash', () => {
        expect(normalizeHex('#abc')).toBe('#aabbcc')
        expect(normalizeHex('ABC')).toBe('#aabbcc')
        expect(normalizeHex('  #0EA5E9  ')).toBe('#0ea5e9')
    })

    test('rejects anything that is not a hex colour', () => {
        expect(normalizeHex('rgb(0 0 0)')).toBeNull()
        expect(normalizeHex('#abcd')).toBeNull()
        expect(normalizeHex('')).toBeNull()
        expect(normalizeHex(42)).toBeNull()
        expect(normalizeHex(null)).toBeNull()
    })
})

describe('parseHex / toHex', () => {
    test('round-trips a six-digit colour', () => {
        expect(parseHex('#0ea5e9')).toEqual({ r: 14, g: 165, b: 233 })
        expect(toHex({ r: 14, g: 165, b: 233 })).toBe('#0ea5e9')
    })

    test('clamps out-of-range channels', () => {
        expect(toHex({ r: 300, g: -4, b: 128.6 })).toBe('#ff0081')
    })
})

describe('mix', () => {
    test('returns either endpoint at weight 0 and 1', () => {
        expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
        expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
        expect(mix('#ff0000', '#0000ff', 0.5)).toBe('#800080')
    })

    test('clamps weights outside the 0-1 range', () => {
        expect(mix('#000000', '#ffffff', -2)).toBe('#000000')
        expect(mix('#000000', '#ffffff', 4)).toBe('#ffffff')
    })

    test('falls back to the valid endpoint', () => {
        expect(mix('not-a-colour', '#ffffff', 0.5)).toBe('#ffffff')
        expect(mix('#ffffff', 'not-a-colour', 0.5)).toBe('#ffffff')
    })
})

describe('withAlpha', () => {
    test('emits a CSS colour with the requested alpha', () => {
        expect(withAlpha('#0ea5e9', 0.25)).toBe('rgb(14 165 233 / 0.25)')
        expect(withAlpha('#0ea5e9', 2)).toBe('rgb(14 165 233 / 1)')
        expect(withAlpha('#0ea5e9', -1)).toBe('rgb(14 165 233 / 0)')
    })
})

describe('HSL conversion', () => {
    test('round-trips primary colours', () => {
        for (const color of ['#ff0000', '#00ff00', '#0000ff', '#64748b', '#f59e0b']) {
            const rgb = parseHex(color)!
            expect(toHex(hslToRgb(rgbToHsl(rgb)))).toBe(color)
        }
    })

    test('reports zero saturation for grey', () => {
        const hsl = rgbToHsl({ r: 128, g: 128, b: 128 })
        expect(hsl.s).toBe(0)
        expect(hsl.h).toBe(0)
    })
})

describe('desaturate', () => {
    test('leaves the colour untouched at 0 and removes colour at 1', () => {
        expect(desaturate('#0ea5e9', 0)).toBe('#0ea5e9')
        const grey = parseHex(desaturate('#0ea5e9', 1))!
        expect(grey.r).toBe(grey.g)
        expect(grey.g).toBe(grey.b)
    })
})

describe('luminance / contrast', () => {
    test('knows the extremes', () => {
        expect(luminance('#ffffff')).toBeCloseTo(1, 5)
        expect(luminance('#000000')).toBeCloseTo(0, 5)
        expect(luminance('#0b1220')).toBeLessThan(0.02)
    })

    test('computes the WCAG contrast ratio', () => {
        expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
        expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 5)
        expect(contrastRatio('#ffffff', '#f8fafc')).toBeLessThan(1.1)
    })

    test('detects dark colours', () => {
        expect(isDark('#000000')).toBe(true)
        expect(isDark('#0b1220')).toBe(true)
        expect(isDark('#ffffff')).toBe(false)
        expect(isDark('#f8fafc')).toBe(false)
    })
})

describe('readableOn', () => {
    test('picks the higher-contrast foreground', () => {
        expect(readableOn('#0b1220')).toBe('#ffffff')
        expect(readableOn('#ffffff')).toBe('#0b1220')
        expect(readableOn('#f59e0b')).toBe('#0b1220')
        expect(readableOn('#dc2626')).toBe('#ffffff')
    })

    test('is symmetric with the exported endpoints', () => {
        expect(WHITE).toEqual({ r: 255, g: 255, b: 255 })
        expect(BLACK).toEqual({ r: 0, g: 0, b: 0 })
    })
})
