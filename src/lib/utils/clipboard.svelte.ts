import { onDestroy } from 'svelte'
import { toast } from './notification'

const COPIED_FEEDBACK_MS = 2000
const SUCCESS_TOAST_MS = 2500
const ERROR_TOAST_MS = 3500

export interface ClipboardCopyFeedback {
    success: string
    error: string
}

export interface ClipboardCopy {
    readonly copied: boolean
    copy: (text: string, feedback: ClipboardCopyFeedback) => Promise<void>
}

/** Shared clipboard write plus "copied" icon state and success/error toasts. Call during component init. */
export function createClipboardCopy(): ClipboardCopy {
    let copied = $state(false)
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    async function copy(text: string, feedback: ClipboardCopyFeedback) {
        try {
            await navigator.clipboard.writeText(text)
            copied = true
            toast.success(feedback.success, SUCCESS_TOAST_MS)
            if (resetTimer) clearTimeout(resetTimer)
            resetTimer = setTimeout(() => {
                resetTimer = undefined
                copied = false
            }, COPIED_FEEDBACK_MS)
        } catch {
            toast.error(feedback.error, ERROR_TOAST_MS)
        }
    }

    onDestroy(() => {
        if (resetTimer) clearTimeout(resetTimer)
    })

    return {
        get copied() {
            return copied
        },
        copy,
    }
}
