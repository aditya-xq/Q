import type { NoteColor } from '$lib/utils/notes'

export interface NoteTheme {
    paper: string
    accent: string
    border: string
    swatch: string
}

/**
 * Notes are fully opaque so they never let the page show through: a soft paper
 * tint plus a tinted hairline carry the colour, while text and controls stay neutral.
 */
export const NOTE_THEME: Record<NoteColor, NoteTheme> = {
    amber: {
        paper: 'bg-amber-100 dark:bg-amber-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-amber-200 dark:border-amber-400/30',
        swatch: '#f59e0b',
    },
    orange: {
        paper: 'bg-orange-100 dark:bg-orange-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-orange-200 dark:border-orange-400/30',
        swatch: '#fb923c',
    },
    rose: {
        paper: 'bg-rose-100 dark:bg-rose-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-rose-200 dark:border-rose-400/30',
        swatch: '#fb7185',
    },
    violet: {
        paper: 'bg-violet-100 dark:bg-violet-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-violet-200 dark:border-violet-400/30',
        swatch: '#a78bfa',
    },
    indigo: {
        paper: 'bg-indigo-100 dark:bg-indigo-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-indigo-200 dark:border-indigo-400/30',
        swatch: '#818cf8',
    },
    sky: {
        paper: 'bg-sky-100 dark:bg-sky-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-sky-200 dark:border-sky-400/30',
        swatch: '#38bdf8',
    },
    teal: {
        paper: 'bg-teal-100 dark:bg-teal-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-teal-200 dark:border-teal-400/30',
        swatch: '#2dd4bf',
    },
    emerald: {
        paper: 'bg-emerald-100 dark:bg-emerald-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-emerald-200 dark:border-emerald-400/30',
        swatch: '#34d399',
    },
    lime: {
        paper: 'bg-lime-100 dark:bg-lime-900',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-lime-200 dark:border-lime-400/30',
        swatch: '#a3e635',
    },
    slate: {
        paper: 'bg-slate-100 dark:bg-slate-800',
        accent: 'text-slate-700 dark:text-slate-100',
        border: 'border-slate-200 dark:border-slate-400/30',
        swatch: '#94a3b8',
    },
}
