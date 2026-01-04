import type { Writeup } from './utils/db'
import type { ProjectWithTasks } from './utils/stores'

interface AppState {
    projectStore: ProjectWithTasks[]
    writeups: Writeup[]
    projectView: boolean
    settingsView: boolean
    writerView: boolean
    isQuickPanelOpen: boolean
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
    projectView: false,
    settingsView: false,
    writerView: false,
    writeups: [],
    isQuickPanelOpen: false,
    keepQuickPanelOpen: false,
    showQuote: true,
    showWeather: true,
})

export const notifications: Notification[] = $state([])
export const notificationId = $state({ value: 0 })
