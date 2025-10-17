import type { ProjectWithTasks } from './utils/stores'

interface AppState {
    projectStore: ProjectWithTasks[]
    projectView: boolean
    settingsView: boolean
    isQuickPanelOpen: boolean
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
    isQuickPanelOpen: false,
})

export const notifications: Notification[] = $state([])
export const notificationId = $state({ value: 0 })
