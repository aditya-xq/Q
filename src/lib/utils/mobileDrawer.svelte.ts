import { onDestroy } from 'svelte'

const CLOSE_ANIMATION_MS = 300

export interface MobileDrawer {
    readonly open: boolean
    readonly animating: boolean
    openDrawer: () => void
    closeDrawer: () => void
    toggleDrawer: () => void
}

/** Shared slide-out drawer state used by the Projects and Writer mobile menus. */
export function createMobileDrawer(): MobileDrawer {
    let open = $state(false)
    let animating = $state(false)
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    let onKeydown: ((event: KeyboardEvent) => void) | null = null

    function attachEscape() {
        if (onKeydown) return
        onKeydown = (event) => {
            if (event.key !== 'Escape' || !open) return
            // A delete confirmation (or another non-modal popover) owns Escape first.
            if (document.querySelector('[role="dialog"][aria-modal="false"]')) return
            event.preventDefault()
            closeDrawer()
        }
        window.addEventListener('keydown', onKeydown)
    }

    function detachEscape() {
        if (!onKeydown) return
        window.removeEventListener('keydown', onKeydown)
        onKeydown = null
    }

    function openDrawer() {
        if (closeTimer) clearTimeout(closeTimer)
        open = true
        document.body.style.overflow = 'hidden'
        attachEscape()
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animating = true
            })
        })
    }

    function closeDrawer() {
        animating = false
        detachEscape()
        if (closeTimer) clearTimeout(closeTimer)
        closeTimer = setTimeout(() => {
            open = false
            document.body.style.overflow = ''
        }, CLOSE_ANIMATION_MS)
    }

    function toggleDrawer() {
        if (open) closeDrawer()
        else openDrawer()
    }

    onDestroy(() => {
        if (closeTimer) clearTimeout(closeTimer)
        detachEscape()
        document.body.style.overflow = ''
    })

    return {
        get open() {
            return open
        },
        get animating() {
            return animating
        },
        openDrawer,
        closeDrawer,
        toggleDrawer,
    }
}
