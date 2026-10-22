/** Small, dependency-free colour helpers used by the theme designer. */

export interface Rgb {
    r: number
    g: number
    b: number
}

export interface Hsl {
    h: number
    s: number
    l: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

export function clamp(value: number, min = 0, max = 1): number {
    return Math.min(max, Math.max(min, value))
}

/** Normalize `#abc`, `abc` and `#AABBCC` to lowercase `#aabbcc`, or null when invalid. */
export function normalizeHex(input: unknown): string | null {
    if (typeof input !== 'string') return null
    const match = HEX_RE.exec(input.trim())
    if (!match) return null
    let hex = match[1].toLowerCase()
    if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    return `#${hex}`
}

export function parseHex(input: string): Rgb | null {
    const hex = normalizeHex(input)
    if (!hex) return null
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    }
}

export function toHex(rgb: Rgb): string {
    const channel = (value: number) =>
        Math.round(clamp(value, 0, 255))
            .toString(16)
            .padStart(2, '0')
    return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`
}

/** Linear RGB mix; `weight` is the share of `to` (0 = from, 1 = to). */
export function mix(from: string, to: string, weight: number): string {
    const a = parseHex(from)
    const b = parseHex(to)
    if (!a) return normalizeHex(to) ?? '#000000'
    if (!b) return normalizeHex(from) ?? '#000000'
    const ratio = clamp(weight)
    return toHex({
        r: a.r + (b.r - a.r) * ratio,
        g: a.g + (b.g - a.g) * ratio,
        b: a.b + (b.b - a.b) * ratio,
    })
}

/** CSS colour with an alpha channel, e.g. `withAlpha('#0ea5e9', 0.2)`. */
export function withAlpha(color: string, alpha: number): string {
    const rgb = parseHex(color) ?? BLACK
    return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${Number(clamp(alpha).toFixed(3))})`
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
    const red = r / 255
    const green = g / 255
    const blue = b / 255
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const l = (max + min) / 2
    const delta = max - min

    if (delta === 0) return { h: 0, s: 0, l }

    const s = delta / (1 - Math.abs(2 * l - 1))
    let h: number
    if (max === red) h = ((green - blue) / delta) % 6
    else if (max === green) h = (blue - red) / delta + 2
    else h = (red - green) / delta + 4

    return { h: (h * 60 + 360) % 360, s, l }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
    const hue = ((h % 360) + 360) % 360
    const chroma = (1 - Math.abs(2 * l - 1)) * clamp(s)
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
    const m = l - chroma / 2

    let rgb: [number, number, number]
    if (hue < 60) rgb = [chroma, x, 0]
    else if (hue < 120) rgb = [x, chroma, 0]
    else if (hue < 180) rgb = [0, chroma, x]
    else if (hue < 240) rgb = [0, x, chroma]
    else if (hue < 300) rgb = [x, 0, chroma]
    else rgb = [chroma, 0, x]

    return {
        r: Math.round((rgb[0] + m) * 255),
        g: Math.round((rgb[1] + m) * 255),
        b: Math.round((rgb[2] + m) * 255),
    }
}

/** Pull a colour towards grey; `amount` 0 keeps it, 1 removes all saturation. */
export function desaturate(color: string, amount: number): string {
    const rgb = parseHex(color)
    if (!rgb) return '#000000'
    const hsl = rgbToHsl(rgb)
    return toHex(hslToRgb({ ...hsl, s: hsl.s * (1 - clamp(amount)) }))
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(color: string): number {
    const rgb = parseHex(color)
    if (!rgb) return 0
    const channel = (value: number) => {
        const scaled = value / 255
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
    const first = luminance(a)
    const second = luminance(b)
    const light = Math.max(first, second)
    const dark = Math.min(first, second)
    return (light + 0.05) / (dark + 0.05)
}

export function isDark(color: string): boolean {
    return luminance(color) < 0.45
}

/** The readable foreground for a filled surface: white on dark, ink on light. */
export function readableOn(color: string): '#ffffff' | '#0b1220' {
    return contrastRatio(color, '#ffffff') >= contrastRatio(color, '#0b1220') ? '#ffffff' : '#0b1220'
}

export { WHITE, BLACK }
