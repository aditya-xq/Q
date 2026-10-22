import { describe, expect, test } from 'bun:test'
import { contrastRatio, luminance, normalizeHex } from '$lib/utils/color'
import {
    ACCENT_SWATCHES,
    DEFAULT_PRESET,
    DEFAULT_THEME,
    FONT_STACKS,
    SEED_SWATCHES,
    THEME_PRESETS,
    activePresetId,
    buildPalette,
    normalizeTheme,
    parseStoredTheme,
    parseThemeCache,
    presetToTheme,
    resolveMode,
    serializeStoredTheme,
    textContrast,
    themeColor,
    themeToVars,
    toThemeCache,
    type ResolvedMode,
} from '$lib/utils/theme'

const MODES: ResolvedMode[] = ['light', 'dark']

describe('theme presets', () => {
    test('have unique ids and valid colours', () => {
        const ids = THEME_PRESETS.map((preset) => preset.id)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.length).toBe(5)

        for (const preset of THEME_PRESETS) {
            expect(normalizeHex(preset.seed)).toBe(preset.seed)
            expect(normalizeHex(preset.accent)).toBe(preset.accent)
            expect(preset.radius).toBeGreaterThanOrEqual(0)
            expect(preset.radius).toBeLessThanOrEqual(24)
            expect(preset.vibrancy).toBeGreaterThanOrEqual(0)
            expect(preset.vibrancy).toBeLessThanOrEqual(100)
        }
    })

    test('the default theme is the Terminal preset in dark mode', () => {
        expect(DEFAULT_THEME.preset).toBe(DEFAULT_PRESET.id)
        expect(DEFAULT_THEME.preset).toBe('terminal')
        expect(DEFAULT_THEME.mode).toBe('dark')
        expect(THEME_PRESETS.map((preset) => preset.accent)).toContain(DEFAULT_THEME.accent)
        expect(SEED_SWATCHES).toContain(DEFAULT_THEME.seed)
        expect(ACCENT_SWATCHES).toContain(DEFAULT_THEME.accent)
    })

    test('presetToTheme keeps the requested mode and is recognised as that preset', () => {
        for (const preset of THEME_PRESETS) {
            const theme = presetToTheme(preset, 'dark')
            expect(theme.mode).toBe('dark')
            expect(activePresetId(theme)).toBe(preset.id)
        }
    })

    test('custom values clear the active preset', () => {
        expect(activePresetId({ ...DEFAULT_THEME, accent: '#123456' })).toBeUndefined()
        expect(activePresetId({ ...DEFAULT_THEME, radius: 20 })).toBeUndefined()
    })
})

describe('normalizeTheme', () => {
    test('falls back to defaults for junk input', () => {
        expect(normalizeTheme(null)).toEqual(DEFAULT_THEME)
        expect(normalizeTheme('nope')).toEqual(DEFAULT_THEME)
        expect(normalizeTheme([])).toEqual(DEFAULT_THEME)
    })

    test('clamps radius and vibrancy into range', () => {
        expect(normalizeTheme({ radius: 999 }).radius).toBe(24)
        expect(normalizeTheme({ radius: -10 }).radius).toBe(0)
        expect(normalizeTheme({ radius: 10.6 }).radius).toBe(11)
        expect(normalizeTheme({ vibrancy: 999 }).vibrancy).toBe(100)
        expect(normalizeTheme({ vibrancy: -5 }).vibrancy).toBe(0)
    })

    test('falls back for null, blank and non-numeric numbers', () => {
        expect(normalizeTheme({ radius: null }).radius).toBe(DEFAULT_THEME.radius)
        expect(normalizeTheme({ radius: '' }).radius).toBe(DEFAULT_THEME.radius)
        expect(normalizeTheme({ radius: 'wide' }).radius).toBe(DEFAULT_THEME.radius)
        expect(normalizeTheme({ vibrancy: null }).vibrancy).toBe(DEFAULT_THEME.vibrancy)
        expect(normalizeTheme({ vibrancy: '   ' }).vibrancy).toBe(DEFAULT_THEME.vibrancy)
    })

    test('rejects unknown enum values but keeps valid fields', () => {
        const theme = normalizeTheme({
            mode: 'sepia',
            font: 'comic',
            surface: 'holographic',
            accent: 'not-a-colour',
            seed: '#AABBCC',
        })
        expect(theme.mode).toBe(DEFAULT_THEME.mode)
        expect(theme.font).toBe(DEFAULT_THEME.font)
        expect(theme.surface).toBe(DEFAULT_THEME.surface)
        expect(theme.accent).toBe(DEFAULT_THEME.accent)
        expect(theme.seed).toBe('#aabbcc')
    })

    test('uses the named preset as the base for missing fields', () => {
        const retro = THEME_PRESETS.find((preset) => preset.id === 'retro')!
        const theme = normalizeTheme({ preset: 'retro', mode: 'dark' })
        expect(theme.preset).toBe('retro')
        expect(theme.accent).toBe(retro.accent)
        expect(theme.font).toBe(retro.font)
    })
})

describe('resolveMode', () => {
    test('resolves explicit modes and follows the system flag', () => {
        expect(resolveMode('light', true)).toBe('light')
        expect(resolveMode('dark', false)).toBe('dark')
        expect(resolveMode('system', true)).toBe('dark')
        expect(resolveMode('system', false)).toBe('light')
    })
})

describe('buildPalette', () => {
    test('keeps body text readable for every preset in both modes', () => {
        for (const preset of THEME_PRESETS) {
            for (const mode of MODES) {
                const palette = buildPalette(presetToTheme(preset, mode), mode)
                expect(contrastRatio(palette.fg, palette.bg)).toBeGreaterThanOrEqual(4.5)
                // Glass surfaces are translucent, so only opaque surfaces can be measured directly.
                if (!palette.surface.startsWith('rgb(')) {
                    expect(contrastRatio(palette.fg, palette.surface)).toBeGreaterThanOrEqual(4.5)
                }
            }
        }
    })

    test('light palettes are light and dark palettes are dark', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        expect(luminance(buildPalette(theme, 'light').bg)).toBeGreaterThan(0.8)
        expect(luminance(buildPalette(theme, 'light').fg)).toBeLessThan(0.2)
        expect(luminance(buildPalette(theme, 'dark').bg)).toBeLessThan(0.1)
        expect(luminance(buildPalette(theme, 'dark').fg)).toBeGreaterThan(0.7)
    })

    test('accent foreground always wins on contrast', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        for (const mode of MODES) {
            for (const accent of ACCENT_SWATCHES) {
                const palette = buildPalette({ ...theme, accent }, mode)
                expect(contrastRatio(palette.accent, palette.accentFg)).toBeGreaterThanOrEqual(4.5)
                expect(contrastRatio(palette.accentText, palette.bg)).toBeGreaterThanOrEqual(4.5)
                expect(contrastRatio(palette.danger, palette.dangerFg)).toBeGreaterThanOrEqual(4.5)
            }
        }
    })

    test('flat surfaces blend into the background and glass is translucent', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        for (const mode of MODES) {
            const flat = buildPalette({ ...theme, surface: 'flat' }, mode)
            expect(flat.surface).toBe(flat.bg)

            const glass = buildPalette({ ...theme, surface: 'glass' }, mode)
            expect(glass.surface).toContain('/ 0.')
            expect(glass.surface).not.toBe(flat.surface)
        }
    })

    test('vibrancy 0 yields neutral greys', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        const palette = buildPalette({ ...theme, vibrancy: 0 }, 'light')
        const channels = new Set(palette.bg.slice(1).match(/.{2}/g) ?? [])
        expect(channels.size).toBe(1)
    })

    test('textContrast matches the palette', () => {
        for (const mode of MODES) {
            const theme = presetToTheme(DEFAULT_PRESET, mode)
            expect(textContrast(theme, mode)).toBeCloseTo(
                contrastRatio(buildPalette(theme, mode).fg, buildPalette(theme, mode).bg),
                5
            )
        }
    })
})

describe('themeToVars', () => {
    test('exports every token the CSS layer reads', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        const vars = themeToVars(theme, 'dark')
        for (const key of [
            '--q-bg',
            '--q-surface',
            '--q-surface-2',
            '--q-fg',
            '--q-fg-muted',
            '--q-fg-subtle',
            '--q-border',
            '--q-border-strong',
            '--q-accent',
            '--q-accent-fg',
            '--q-accent-text',
            '--q-accent-soft',
            '--q-accent-strong',
            '--q-danger',
            '--q-success',
            '--q-warning',
            '--q-selection',
            '--q-radius',
            '--q-font',
            '--q-shadow-card',
            '--q-app-bg',
            '--q-glass-blur',
        ]) {
            expect(vars[key]).toBeString()
        }
        expect(vars['--q-radius']).toBe(`${theme.radius}px`)
        expect(vars['--q-font']).toBe(FONT_STACKS[theme.font])
        // The default Terminal preset is flat; glass turns the blur on.
        expect(vars['--q-glass-blur']).toBe('0px')
        expect(themeToVars({ ...theme, surface: 'glass' }, 'dark')['--q-glass-blur']).toBe('16px')
    })

    test('glass surfaces enable the blur token', () => {
        expect(themeToVars({ ...DEFAULT_THEME, surface: 'glass' }, 'light')['--q-glass-blur']).toBe('16px')
    })

    test('themeColor is the page background', () => {
        const theme = presetToTheme(DEFAULT_PRESET)
        expect(themeColor(theme, 'light')).toBe(buildPalette(theme, 'light').bg)
    })
})

describe('theme cache', () => {
    test('round-trips both palettes, the config and the timestamp', () => {
        const theme = presetToTheme(THEME_PRESETS[2], 'dark')
        const cache = toThemeCache(theme, 1234)
        const parsed = parseThemeCache(JSON.stringify(cache))
        expect(parsed).not.toBeNull()
        expect(parsed!.theme).toEqual(theme)
        expect(parsed!.savedAt).toBe(1234)
        expect(parsed!.light['--q-bg']).toBe(cache.light['--q-bg'])
        expect(parsed!.dark['--q-bg']).toBe(cache.dark['--q-bg'])
    })

    test('rejects malformed caches', () => {
        expect(parseThemeCache(null)).toBeNull()
        expect(parseThemeCache('nope')).toBeNull()
        expect(parseThemeCache('{}')).toBeNull()
        expect(parseThemeCache(JSON.stringify({ light: {}, dark: {} }))).toBeNull()
        expect(parseThemeCache(JSON.stringify({ light: { '--evil': 'x' }, dark: {} }))).toBeNull()
    })

    test('drops keys outside the --q- namespace', () => {
        const raw = JSON.stringify({
            theme: DEFAULT_THEME,
            light: { '--q-bg': '#fff', '--evil': 'url(javascript:alert(1))' },
            dark: { '--q-bg': '#000' },
        })
        expect(parseThemeCache(raw)?.light).toEqual({ '--q-bg': '#fff' })
    })
})

describe('stored theme row', () => {
    test('round-trips the theme and timestamp', () => {
        const theme = presetToTheme(THEME_PRESETS[4], 'light')
        const stored = parseStoredTheme(serializeStoredTheme(theme, 9876))
        expect(stored?.theme).toEqual(theme)
        expect(stored?.savedAt).toBe(9876)
    })

    test('accepts a legacy flat theme payload', () => {
        const stored = parseStoredTheme(JSON.stringify(DEFAULT_THEME))
        expect(stored?.theme).toEqual(DEFAULT_THEME)
        expect(stored?.savedAt).toBe(0)
    })

    test('normalizes a partial legacy payload', () => {
        expect(parseStoredTheme('{"accent":"#ff0000"}')?.theme).toMatchObject({
            accent: '#ff0000',
            mode: DEFAULT_THEME.mode,
        })
    })

    test('rejects junk', () => {
        expect(parseStoredTheme(null)).toBeNull()
        expect(parseStoredTheme('')).toBeNull()
        expect(parseStoredTheme('[]')).toBeNull()
        expect(parseStoredTheme('{nope')).toBeNull()
    })
})
