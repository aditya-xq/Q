<script lang="ts">
    import { tick } from 'svelte'
    import { fade } from 'svelte/transition'

    let { handleDelete, label = 'item' }: { handleDelete: () => void; label?: string } = $props()

    let showConfirmDelete = $state(false)
    let triggerEl = $state<HTMLButtonElement | undefined>(undefined)
    let popupEl = $state<HTMLElement | undefined>(undefined)
    let positioned = $state(false)
    let position = $state({ top: -9999, left: -9999 })

    /** Move the popup to <body> so scroll containers and overflow:hidden never clip it. */
    function portal(node: HTMLElement) {
        document.body.appendChild(node)
        return {
            destroy() {
                node.remove()
            },
        }
    }

    function closeConfirm(restoreFocus = true) {
        showConfirmDelete = false
        if (restoreFocus && triggerEl?.isConnected) triggerEl.focus()
    }

    function updatePosition() {
        if (!triggerEl || !popupEl) return
        const trigger = triggerEl.getBoundingClientRect()
        const popup = popupEl.getBoundingClientRect()
        const margin = 8
        const gap = 8

        let top = trigger.bottom + gap
        if (top + popup.height > window.innerHeight - margin) {
            top = Math.max(margin, trigger.top - popup.height - gap)
        }

        // Right-align to the trigger, then clamp to the viewport (important on mobile).
        let left = trigger.right - popup.width
        left = Math.min(Math.max(margin, left), window.innerWidth - popup.width - margin)

        position = { top, left }
        positioned = true
    }

    $effect(() => {
        if (!showConfirmDelete) {
            positioned = false
            return
        }

        positioned = false
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node
            if (popupEl?.contains(target) || triggerEl?.contains(target)) return
            closeConfirm(false)
        }
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            closeConfirm()
        }
        const onViewportChange = () => updatePosition()

        const frame = requestAnimationFrame(() => {
            updatePosition()
            void tick().then(() => {
                if (showConfirmDelete) popupEl?.querySelector<HTMLButtonElement>('button')?.focus()
            })
        })

        document.addEventListener('click', onDocumentClick)
        window.addEventListener('keydown', onKeydown)
        window.addEventListener('resize', onViewportChange)
        window.addEventListener('scroll', onViewportChange, true)

        return () => {
            cancelAnimationFrame(frame)
            document.removeEventListener('click', onDocumentClick)
            window.removeEventListener('keydown', onKeydown)
            window.removeEventListener('resize', onViewportChange)
            window.removeEventListener('scroll', onViewportChange, true)
        }
    })
</script>

<div class="relative inline-block">
    <button
        bind:this={triggerEl}
        class="p-1.5 rounded-full transition-colors text-fg-subtle hover:text-danger hover:bg-surface-2"
        onclick={(event) => {
            event.stopPropagation()
            if (showConfirmDelete) closeConfirm()
            else showConfirmDelete = true
        }}
        aria-label={`Delete ${label}`}
        aria-haspopup="dialog"
        aria-expanded={showConfirmDelete}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    </button>

    {#if showConfirmDelete}
        <div
            use:portal
            bind:this={popupEl}
            class="fixed z-[1050] w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-danger/40 bg-danger-soft/95 p-3 shadow-lg backdrop-blur-sm
                {positioned ? '' : 'invisible'}"
            style:top={`${position.top}px`}
            style:left={`${position.left}px`}
            in:fade={{ duration: 120 }}
            role="dialog"
            aria-label={`Confirm delete ${label}`}
            aria-modal="false"
        >
            <p class="mb-2 text-sm text-danger">Are you sure you want to delete this?</p>

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onclick={(event) => {
                        event.stopPropagation()
                        closeConfirm()
                    }}
                    class="rounded-lg border border-danger/40 bg-transparent px-3 py-1.5 text-xs text-danger transition hover:bg-danger-soft focus:outline-none focus:ring-2 focus:ring-danger/30"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    data-confirm-delete-button
                    onclick={handleDelete}
                    class="rounded-lg bg-danger px-3 py-1.5 text-xs text-danger-fg transition hover:bg-danger/90"
                >
                    Delete
                </button>
            </div>
        </div>
    {/if}
</div>
