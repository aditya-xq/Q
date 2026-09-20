import type { NoteColor } from '$lib/utils/notes'

export interface NoteTheme {
    paper: string
    accent: string
    border: string
    swatch: string
}

export const NOTE_THEME: Record<NoteColor, NoteTheme> = {
    amber: {
        paper: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/95 dark:to-amber-950/95',
        accent: 'text-amber-950 dark:text-amber-50',
        border: 'border-amber-300/70 dark:border-amber-800',
        swatch: '#fcd34d',
    },
    rose: {
        paper: 'bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/95 dark:to-rose-950/95',
        accent: 'text-rose-950 dark:text-rose-50',
        border: 'border-rose-300/70 dark:border-rose-800',
        swatch: '#fda4af',
    },
    sky: {
        paper: 'bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/95 dark:to-sky-950/95',
        accent: 'text-sky-950 dark:text-sky-50',
        border: 'border-sky-300/70 dark:border-sky-800',
        swatch: '#7dd3fc',
    },
    emerald: {
        paper: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/95 dark:to-emerald-950/95',
        accent: 'text-emerald-950 dark:text-emerald-50',
        border: 'border-emerald-300/70 dark:border-emerald-800',
        swatch: '#6ee7b7',
    },
    violet: {
        paper: 'bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/95 dark:to-violet-950/95',
        accent: 'text-violet-950 dark:text-violet-50',
        border: 'border-violet-300/70 dark:border-violet-800',
        swatch: '#c4b5fd',
    },
    orange: {
        paper: 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/95 dark:to-orange-950/95',
        accent: 'text-orange-950 dark:text-orange-50',
        border: 'border-orange-300/70 dark:border-orange-800',
        swatch: '#fdba74',
    },
}
