const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab focus inside a dialog/panel while it is open. Pass `false` to
 * disable the trap without unmounting the node (e.g. a responsive menu).
 */
export function focusTrap(node: HTMLElement, active = true) {
    let enabled = active

    function onKeydown(event: KeyboardEvent) {
        if (!enabled || event.key !== 'Tab') return

        const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (element) => element.getClientRects().length > 0
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const current = document.activeElement

        if (event.shiftKey && (current === first || current === node)) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && current === last) {
            event.preventDefault()
            first.focus()
        }
    }

    node.addEventListener('keydown', onKeydown)

    return {
        update(next: boolean) {
            enabled = next
        },
        destroy() {
            node.removeEventListener('keydown', onKeydown)
        },
    }
}
