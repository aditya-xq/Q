import type { Writeup } from './utils/db'
import type { ProjectWithTasks } from './utils/stores'

export type View = 'projects' | 'writer' | 'games' | 'home' | 'quick-panel' | 'finance'

interface AppState {
    projectStore: ProjectWithTasks[]
    writeups: Writeup[]
    view: View
    keepQuickPanelOpen?: boolean
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
    keepQuickPanelOpen: false,
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
    if (nextView !== 'games') {
        params.delete('game')
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
