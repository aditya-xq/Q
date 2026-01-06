import type { Writeup } from './utils/db'
import type { ProjectWithTasks } from './utils/stores'

export type View = 'projects' | 'writer' | 'games' | 'home' | 'quick-panel'

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
    showWeather: true,
})

export const notifications: Notification[] = $state([])
export const notificationId = $state({ value: 0 })

export  function updateView(view: View) {
    if (appState.view === view) {
        appState.view = 'home'
        return
    }
    appState.view = view
}
