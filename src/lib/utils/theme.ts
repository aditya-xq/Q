import { clamp, contrastRatio, desaturate, isDark, mix, normalizeHex, readableOn, withAlpha } from './color'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeFont = 'sans' | 'rounded' | 'serif' | 'mono'
export type ThemeSurface = 'flat' | 'soft' | 'elevated' | 'glass'
export type ResolvedMode = 'light' | 'dark'

export interface ThemeConfig {
    mode: ThemeMode
    preset: string
    /** Neutral seed colour; it tints the background, text and borders. */
    seed: string
    accent: string
    /** Corner radius in pixels; the whole radius scale derives from it. */
    radius: number
    font: ThemeFont
    surface: ThemeSurface
    /** How strongly the seed colour tints the surfaces, 0 (grey) to 100 (vivid). */
    vibrancy: number
}

export interface ThemePreset {
    id: string
    name: string
    description: string
    seed: string
    accent: string
    radius: number
    font: ThemeFont
    surface: ThemeSurface
    vibrancy: number
}

export interface ThemePalette {
    bg: string
    surface: string
    surface2: string
    fg: string
    fgMuted: string
    fgSubtle: string
    border: string
    borderStrong: string
    accent: string
    accentFg: string
    /** Accent tuned for text/icons on the page background (>= 5:1). */
    accentText: string
    accentSoft: string
    accentStrong: string
    danger: string
    dangerFg: string
    dangerSoft: string
    success: string
    successFg: string
    successSoft: string
    warning: string
    warningFg: string
    warningSoft: string
    selection: string
}

/** Theme cache read by the pre-paint script; the key must match `app.html`. */
export const THEME_STORAGE_KEY = 'q:theme'
export const THEME_SETTING_KEY = 'theme'

export const FONT_STACKS: Record<ThemeFont, string> = {
    sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    rounded: "ui-rounded, 'Segoe UI Variable Display', 'Nunito', 'Varela Round', system-ui, sans-serif",
    serif: "ui-serif, 'Iowan Old Style', Georgia, Cambria, 'Times New Roman', serif",
    mono: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
}

export const FONT_OPTIONS: { id: ThemeFont; label: string; sample: string }[] = [
    { id: 'sans', label: 'Sans', sample: 'Aa' },
    { id: 'rounded', label: 'Rounded', sample: 'Aa' },
    { id: 'serif', label: 'Serif', sample: 'Aa' },
    { id: 'mono', label: 'Mono', sample: 'Aa' },
]

export const SURFACE_OPTIONS: { id: ThemeSurface; label: string; description: string }[] = [
    { id: 'flat', label: 'Flat', description: 'Blends into the page' },
    { id: 'soft', label: 'Soft', description: 'Gentle lift' },
    { id: 'elevated', label: 'Elevated', description: 'Clear depth' },
    { id: 'glass', label: 'Glass', description: 'Translucent blur' },
]

export const MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
]

export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'terminal',
        name: 'Terminal',
        description: 'Monospaced, phosphor green, sharp edges',
        seed: '#0b0f0d',
        accent: '#22c55e',
        radius: 2,
        font: 'mono',
        surface: 'flat',
        vibrancy: 0,
    },
    {
        id: 'prism',
        name: 'Prism',
        description: 'Frosted glass with a cool violet glow',
        seed: '#6366f1',
        accent: '#06b6d4',
        radius: 18,
        font: 'sans',
        surface: 'glass',
        vibrancy: 45,
    },
    {
        id: 'contrast',
        name: 'High Contrast',
        description: 'Pure black and white with a vivid signal accent',
        seed: '#000000',
        accent: '#facc15',
        radius: 2,
        font: 'sans',
        surface: 'flat',
        vibrancy: 0,
    },
    {
        id: 'retro',
        name: 'Retro',
        description: 'Warm 70s print with burnt-orange accents',
        seed: '#b08968',
        accent: '#c2410c',
        radius: 6,
        font: 'serif',
        surface: 'soft',
        vibrancy: 65,
    },
    {
        id: 'atelier',
        name: 'Atelier',
        description: 'Plum and gold, editorial and expressive',
        seed: '#6d28d9',
        accent: '#f59e0b',
        radius: 14,
        font: 'serif',
        surface: 'elevated',
        vibrancy: 55,
    },
]

export const DEFAULT_PRESET = THEME_PRESETS[0]

/** First run opens in the Terminal preset, dark. Existing saved themes are untouched. */
export const DEFAULT_THEME: ThemeConfig = presetToTheme(DEFAULT_PRESET, 'dark')

export const ACCENT_SWATCHES = ['#22c55e', '#06b6d4', '#facc15', '#c2410c', '#f59e0b', '#4f46e5', '#ec4899', '#ef4444']

export const SEED_SWATCHES = [
    '#0b0f0d',
    '#6366f1',
    '#000000',
    '#b08968',
    '#6d28d9',
    '#64748b',
    '#334155',
    '#0f766e',
    '#a16207',
    '#9d7c8f',
]

function presetValues(preset: ThemePreset) {
    return {
        seed: preset.seed,
        accent: preset.accent,
        radius: preset.radius,
        font: preset.font,
        surface: preset.surface,
        vibrancy: preset.vibrancy,
    }
}

export function getPreset(id: string): ThemePreset | undefined {
    return THEME_PRESETS.find((preset) => preset.id === id)
}

/** Build a full theme from a preset, keeping the caller's mode. */
export function presetToTheme(preset: ThemePreset, mode: ThemeMode = DEFAULT_THEME.mode): ThemeConfig {
    return { mode, preset: preset.id, ...presetValues(preset) }
}

/** The preset whose values the theme still matches exactly, if any. */
export function activePresetId(theme: ThemeConfig): string | undefined {
    return THEME_PRESETS.find((preset) => {
        const values = presetValues(preset)
        return (
            values.seed === theme.seed &&
            values.accent === theme.accent &&
            values.radius === theme.radius &&
            values.font === theme.font &&
            values.surface === theme.surface &&
            values.vibrancy === theme.vibrancy
        )
    })?.id
}

const MODES: ThemeMode[] = ['light', 'dark', 'system']
const FONTS = Object.keys(FONT_STACKS) as ThemeFont[]
const SURFACES = SURFACE_OPTIONS.map((option) => option.id)

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
    return typeof value === 'string' && (options as readonly string[]).includes(value)
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string' && value.trim() === '') return fallback
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.round(Math.min(max, Math.max(min, parsed)))
}

/** Accept anything (JSON, a stale row, a hand-edited value) and return a safe theme. */
export function normalizeTheme(value: unknown): ThemeConfig {
    const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
    const preset = getPreset(typeof record.preset === 'string' ? record.preset : '')
    const base = preset ? presetToTheme(preset) : DEFAULT_THEME

    return {
        mode: isOneOf(record.mode, MODES) ? record.mode : DEFAULT_THEME.mode,
        preset: preset?.id ?? DEFAULT_THEME.preset,
        seed: normalizeHex(record.seed) ?? base.seed,
        accent: normalizeHex(record.accent) ?? base.accent,
        radius: clampNumber(record.radius, 0, 24, base.radius),
        font: isOneOf(record.font, FONTS) ? record.font : base.font,
        surface: isOneOf(record.surface, SURFACES) ? record.surface : base.surface,
        vibrancy: clampNumber(record.vibrancy, 0, 100, base.vibrancy),
    }
}

export function resolveMode(mode: ThemeMode, systemDark: boolean): ResolvedMode {
    if (mode === 'system') return systemDark ? 'dark' : 'light'
    return mode
}

/** Perceptual lightness of the two ends of the neutral scale. */
const INK = '#0b1220'
const PAPER = '#ffffff'
const NIGHT = '#070a0f'

/** Nudge a colour towards the readable end of the scale until it passes on `bg`. */
function readableAccent(accent: string, bg: string): string {
    const towards = isDark(bg) ? PAPER : '#000000'
    let result = accent
    for (let step = 0; step < 20 && contrastRatio(result, bg) < 5; step++) {
        result = mix(result, towards, 0.1)
    }
    return result
}

export function buildPalette(theme: ThemeConfig, mode: ResolvedMode): ThemePalette {
    const light = mode === 'light'
    const strength = clamp(theme.vibrancy / 100)
    const seed = desaturate(theme.seed, 1 - strength)
    const accent = theme.accent

    // Vibrancy controls both saturation and how strongly the seed tints the page.
    const bg = light ? mix(PAPER, seed, 0.015 + 0.055 * strength) : mix(NIGHT, seed, 0.06 + 0.12 * strength)
    const fg = light ? mix(seed, INK, 0.88) : mix(seed, '#f5f8fc', 0.9)
    const fgMuted = mix(fg, bg, 0.38)
    const fgSubtle = mix(fg, bg, 0.58)
    const border = mix(bg, fg, 0.12)
    const borderStrong = mix(bg, fg, light ? 0.22 : 0.3)

    const baseSurface = light ? mix(PAPER, seed, 0.008 + 0.022 * strength) : mix('#0d121a', seed, 0.1 + 0.08 * strength)
    const baseSurface2 = light ? mix(PAPER, seed, 0.04 + 0.05 * strength) : mix('#151c26', seed, 0.14 + 0.08 * strength)

    let surface = baseSurface
    let surface2 = baseSurface2
    if (theme.surface === 'flat') {
        surface = bg
        surface2 = mix(bg, fg, 0.07)
    } else if (theme.surface === 'glass') {
        surface = withAlpha(baseSurface, light ? 0.72 : 0.66)
        surface2 = withAlpha(baseSurface2, light ? 0.6 : 0.55)
    }

    const danger = light ? '#dc2626' : '#f87171'
    const success = light ? '#15803d' : '#4ade80'
    const warning = light ? '#b45309' : '#fbbf24'
    const soft = (color: string) => (light ? mix(PAPER, color, 0.12) : mix(bg, color, 0.22))

    return {
        bg,
        surface,
        surface2,
        fg,
        fgMuted,
        fgSubtle,
        border,
        borderStrong,
        accent,
        accentFg: readableOn(accent),
        accentText: readableAccent(accent, bg),
        accentSoft: light ? mix(PAPER, accent, 0.14) : mix(bg, accent, 0.28),
        accentStrong: light ? mix(accent, '#000000', 0.12) : mix(accent, '#ffffff', 0.14),
        danger,
        dangerFg: readableOn(danger),
        dangerSoft: soft(danger),
        success,
        successFg: readableOn(success),
        successSoft: soft(success),
        warning,
        warningFg: readableOn(warning),
        warningSoft: soft(warning),
        selection: withAlpha(accent, 0.3),
    }
}

function themeShadow(theme: ThemeConfig, mode: ResolvedMode): string {
    if (theme.surface === 'flat') return '0 0 #0000'
    return mode === 'light'
        ? '0 1px 2px rgb(0 0 0 / 0.06), 0 10px 24px -18px rgb(0 0 0 / 0.25)'
        : '0 1px 2px rgb(0 0 0 / 0.4), 0 12px 28px -18px rgb(0 0 0 / 0.7)'
}

function themeGradient(theme: ThemeConfig, mode: ResolvedMode): string {
    if (theme.surface === 'flat') return 'none'
    const strong = theme.surface === 'glass'
    const accentGlow = withAlpha(theme.accent, mode === 'light' ? (strong ? 0.16 : 0.08) : strong ? 0.22 : 0.12)
    const seedGlow = withAlpha(theme.seed, mode === 'light' ? (strong ? 0.14 : 0.06) : strong ? 0.2 : 0.1)
    return `radial-gradient(70rem 44rem at 8% -10%, ${accentGlow}, transparent 60%), radial-gradient(52rem 38rem at 100% 108%, ${seedGlow}, transparent 65%)`
}

/** Every CSS custom property the app reads. Kept flat so it can be cached and inlined. */
export function themeToVars(theme: ThemeConfig, mode: ResolvedMode): Record<string, string> {
    const palette = buildPalette(theme, mode)
    return {
        '--q-bg': palette.bg,
        '--q-surface': palette.surface,
        '--q-surface-2': palette.surface2,
        '--q-fg': palette.fg,
        '--q-fg-muted': palette.fgMuted,
        '--q-fg-subtle': palette.fgSubtle,
        '--q-border': palette.border,
        '--q-border-strong': palette.borderStrong,
        '--q-accent': palette.accent,
        '--q-accent-fg': palette.accentFg,
        '--q-accent-text': palette.accentText,
        '--q-accent-soft': palette.accentSoft,
        '--q-accent-strong': palette.accentStrong,
        '--q-danger': palette.danger,
        '--q-danger-fg': palette.dangerFg,
        '--q-danger-soft': palette.dangerSoft,
        '--q-success': palette.success,
        '--q-success-fg': palette.successFg,
        '--q-success-soft': palette.successSoft,
        '--q-warning': palette.warning,
        '--q-warning-fg': palette.warningFg,
        '--q-warning-soft': palette.warningSoft,
        '--q-selection': palette.selection,
        '--q-radius': `${theme.radius}px`,
        '--q-font': FONT_STACKS[theme.font],
        '--q-shadow-card': themeShadow(theme, mode),
        '--q-app-bg': themeGradient(theme, mode),
        '--q-glass-blur': theme.surface === 'glass' ? '16px' : '0px',
    }
}

export function themeColor(theme: ThemeConfig, mode: ResolvedMode): string {
    return buildPalette(theme, mode).bg
}

/** Contrast between body text and the page background, for the designer's hint. */
export function textContrast(theme: ThemeConfig, mode: ResolvedMode): number {
    const palette = buildPalette(theme, mode)
    return contrastRatio(palette.fg, palette.bg)
}

export interface ThemeCache {
    theme: ThemeConfig
    light: Record<string, string>
    dark: Record<string, string>
    savedAt: number
}

export interface StoredTheme {
    theme: ThemeConfig
    savedAt: number
}

export function toThemeCache(theme: ThemeConfig, savedAt = Date.now()): ThemeCache {
    return {
        theme,
        light: themeToVars(theme, 'light'),
        dark: themeToVars(theme, 'dark'),
        savedAt,
    }
}

/** Read the IndexedDB payload, accepting the earlier flat `theme` shape too. */
export function parseStoredTheme(raw: string | null | undefined): StoredTheme | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as unknown
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
        if ('theme' in parsed) {
            const record = parsed as { theme?: unknown; savedAt?: unknown }
            return {
                theme: normalizeTheme(record.theme),
                savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
            }
        }
        return { theme: normalizeTheme(parsed), savedAt: 0 }
    } catch {
        return null
    }
}

export function serializeStoredTheme(theme: ThemeConfig, savedAt: number): string {
    return JSON.stringify({ theme: normalizeTheme(theme), savedAt })
}

const VAR_PREFIX = '--q-'

function readVars(value: unknown): Record<string, string> | null {
    if (typeof value !== 'object' || value === null) return null
    const vars: Record<string, string> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (!key.startsWith(VAR_PREFIX) || typeof entry !== 'string') continue
        vars[key] = entry
    }
    return Object.keys(vars).length > 0 ? vars : null
}

/** Validate the localStorage cache written by a previous session. */
export function parseThemeCache(raw: string | null | undefined): ThemeCache | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (typeof parsed !== 'object' || parsed === null) return null
        const light = readVars(parsed.light)
        const dark = readVars(parsed.dark)
        if (!light || !dark) return null
        return {
            theme: normalizeTheme(parsed.theme),
            light,
            dark,
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
        }
    } catch {
        return null
    }
}
