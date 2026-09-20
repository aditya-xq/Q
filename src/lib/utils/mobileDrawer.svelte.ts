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

    function openDrawer() {
        if (closeTimer) clearTimeout(closeTimer)
        open = true
        document.body.style.overflow = 'hidden'
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animating = true
            })
        })
    }

    function closeDrawer() {
        animating = false
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
