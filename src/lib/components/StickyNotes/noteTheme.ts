import type { NoteColor } from '$lib/utils/notes'

interface NotePalette {
    paper: string
    accent: string
    border: string
    dust: [string, string, string, string]
}

export interface NoteTheme extends NotePalette {
    swatch: string
}

const PALETTE: Record<NoteColor, NotePalette> = {
    amber: {
        paper: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/80 dark:to-amber-950/80',
        accent: 'text-amber-950 dark:text-amber-50',
        border: 'border-amber-300/70 dark:border-amber-800',
        dust: ['#fde68a', '#fcd34d', '#f59e0b', '#b45309'],
    },
    rose: {
        paper: 'bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/80 dark:to-rose-950/80',
        accent: 'text-rose-950 dark:text-rose-50',
        border: 'border-rose-300/70 dark:border-rose-800',
        dust: ['#fecdd3', '#fda4af', '#fb7185', '#9f1239'],
    },
    sky: {
        paper: 'bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/80 dark:to-sky-950/80',
        accent: 'text-sky-950 dark:text-sky-50',
        border: 'border-sky-300/70 dark:border-sky-800',
        dust: ['#bae6fd', '#7dd3fc', '#38bdf8', '#075985'],
    },
    emerald: {
        paper: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/80 dark:to-emerald-950/80',
        accent: 'text-emerald-950 dark:text-emerald-50',
        border: 'border-emerald-300/70 dark:border-emerald-800',
        dust: ['#a7f3d0', '#6ee7b7', '#34d399', '#065f46'],
    },
    violet: {
        paper: 'bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/80 dark:to-violet-950/80',
        accent: 'text-violet-950 dark:text-violet-50',
        border: 'border-violet-300/70 dark:border-violet-800',
        dust: ['#ddd6fe', '#c4b5fd', '#a78bfa', '#5b21b6'],
    },
    orange: {
        paper: 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/80 dark:to-orange-950/80',
        accent: 'text-orange-950 dark:text-orange-50',
        border: 'border-orange-300/70 dark:border-orange-800',
        dust: ['#fed7aa', '#fdba74', '#fb923c', '#9a3412'],
    },
}

/** `swatch` is derived from the dust palette so the two can never drift apart. */
export const NOTE_THEME = Object.fromEntries(
    Object.entries(PALETTE).map(([color, palette]) => [color, { ...palette, swatch: palette.dust[1] }])
) as Record<NoteColor, NoteTheme>
