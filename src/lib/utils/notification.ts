import { notificationId, notifications } from '$lib/state.svelte'

/**
 * Shows a notification with the given message and type
 * @param message The notification message
 * @param type The notification type: 'success', 'error', 'warning', or 'info'
 * @param duration Duration in milliseconds before auto-dismissal (default: 3000ms)
 * @returns The ID of the created notification
 */
export function notify(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) {
    // Generate a unique ID for the notification
    notificationId.value++
    const id = String(notificationId.value)
    notifications.push({ id, message, type })

    // Auto-remove notification after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(id)
        }, duration)
    }

    return id
}

/**
 * Removes a notification by its ID
 * @param id The ID of the notification to remove
 */
export function removeNotification(id: string) {
    const index = notifications.findIndex((n) => n.id === id)
    if (index !== -1) {
        notifications.splice(index, 1)
    }
}

/**
 * Helper function to determine notification styling based on type
 * @param type The notification type
 * @returns CSS classes for the notification
 */
export function getNotificationColor(type: string) {
    switch (type) {
        case 'success':
            return 'bg-success-soft border-success text-success'
        case 'error':
            return 'bg-danger-soft border-danger text-danger'
        case 'warning':
            return 'bg-warning-soft border-warning text-warning'
        case 'info':
        default:
            return 'bg-accent-soft border-accent text-accent-text'
    }
}

/**
 * Shorthand functions for common notification types
 */
export const toast = {
    success: (message: string, duration = 3000) => notify(message, 'success', duration),
    error: (message: string, duration = 3000) => notify(message, 'error', duration),
    warning: (message: string, duration = 3000) => notify(message, 'warning', duration),
    info: (message: string, duration = 3000) => notify(message, 'info', duration),
}
