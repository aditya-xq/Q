import type { Note, WriteupSummary } from './utils/db'
import type { ProjectWithTasks } from './utils/stores'

export type View = 'projects' | 'writer' | 'home'

interface AppState {
    projectStore: ProjectWithTasks[]
    writeups: WriteupSummary[]
    notes: Note[]
    view: View
    composeNoteId?: number
    showQuote?: boolean
    showWeather?: boolean
}

interface Notification {
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
}

export const appState: AppState = $state({
    projectStore: [],
    view: 'home',
    writeups: [],
    notes: [],
    showQuote: true,
    showWeather: false,
})

export const notifications: Notification[] = $state([])
export const notificationId = $state({ value: 0 })

function syncViewParam(nextView: View) {
    if (typeof window === 'undefined') return
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const url = new URL(window.location.href)
    const params = url.searchParams
    if (nextView === 'home') {
        params.delete('view')
    } else {
        params.set('view', nextView)
    }
    const nextSearch = params.toString()
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`
    if (nextUrl !== currentUrl) {
        history.replaceState({}, '', nextUrl)
    }
}

export function updateView(view: View) {
    const nextView = appState.view === view ? 'home' : view
    appState.view = nextView
    syncViewParam(nextView)
}

export const NOTE_Z_BASE = 30
const NOTE_Z_TOP = 48

let noteZTop = NOTE_Z_BASE

/** Raise-to-front counter for sticky notes, kept below the app chrome (rails/nav). */
export function nextNoteZ(): number {
    noteZTop = noteZTop >= NOTE_Z_TOP ? NOTE_Z_BASE : noteZTop + 1
    return noteZTop
}
