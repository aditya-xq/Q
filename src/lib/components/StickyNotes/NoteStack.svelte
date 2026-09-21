<script lang="ts">
    import { onMount, tick } from 'svelte'
    import { cubicOut } from 'svelte/easing'
    import { fade, fly } from 'svelte/transition'
    import { appState } from '$lib/state.svelte'
    import { createNote } from '$lib/stores/notes'
    import type { Note } from '$lib/utils/db'
    import StickyNote from './StickyNote.svelte'

    interface Props {
        onDeleted?: (note: Note) => void
    }

    let { onDeleted }: Props = $props()

    let open = $state(false)
    let reduceMotion = $state(false)
    let fabEl = $state<HTMLButtonElement | undefined>(undefined)
    let panelEl = $state<HTMLElement | undefined>(undefined)

    // Newest first, so a freshly jotted note lands on top of the pile.
    let notes = $derived([...appState.notes].reverse())
    let noteCount = $derived(appState.notes.length)
    let duration = $derived(reduceMotion ? 0 : 240)

    onMount(() => {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })

    async function openSheet() {
        if (open) return
        open = true
        await tick()
        panelEl?.focus()
    }

    function closeSheet() {
        if (!open) return
        open = false
        fabEl?.focus()
    }

    async function addNote() {
        if (!open) {
            open = true
            await tick()
        }
        // The mobile stack has no free positioning, so skip the board's parking glide.
        await createNote({ stage: false })
    }

    function clearCompose() {
        appState.composeNoteId = undefined
    }

    function onWindowKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeSheet()
        }
    }

    /** Keep Tab focus inside the sheet while it is open. */
    function onPanelKeydown(event: KeyboardEvent) {
        if (event.key !== 'Tab') return
        const focusables = panelEl?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, [href]')
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (event.shiftKey && (active === first || active === panelEl)) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && active === last) {
            event.preventDefault()
            first.focus()
        }
    }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- Mobile entry point: a small notes button that opens the sheet. -->
<button
    bind:this={fabEl}
    type="button"
    class="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[55] flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.4)] backdrop-blur-md transition duration-200 hover:border-slate-300 hover:text-slate-800 active:scale-95 dark:border-slate-700/70 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
    aria-label={noteCount > 0 ? `Open notes (${noteCount})` : 'Open notes'}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls="notes-sheet"
    data-testid="notes-fab"
    onclick={openSheet}
>
    <svg class="h-5 w-5 text-amber-500/90 dark:text-amber-400/90" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 3.75h7.5L19 8.25V19a1.25 1.25 0 0 1-1.25 1.25H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75Z"
        />
        <path stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M14.25 3.9V8.25H18.6" />
        <path stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M8.75 12h6.5M8.75 15.5h4.5" />
    </svg>
    {#if noteCount > 0}
        <span
            class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900/90 px-1.5 text-[10px] font-semibold text-white ring-2 ring-white/85 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-900/85"
            data-testid="notes-fab-count"
        >
            {noteCount > 99 ? '99+' : noteCount}
        </span>
    {/if}
</button>

{#if open}
    <div class="fixed inset-0 z-[1100]">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="absolute inset-0 bg-slate-900/25 backdrop-blur-[3px]"
            transition:fade={{ duration }}
            data-testid="notes-backdrop"
            onclick={closeSheet}
        ></div>

        <div
            bind:this={panelEl}
            class="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col overflow-hidden rounded-t-[26px] border-t border-slate-200/80 bg-white shadow-[0_-16px_48px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-label="Notes"
            tabindex="-1"
            id="notes-sheet"
            data-testid="notes-sheet"
            onkeydown={onPanelKeydown}
            transition:fly={{ y: 48, duration, easing: cubicOut }}
        >
            <div class="flex justify-center pt-2.5" aria-hidden="true">
                <span class="h-1 w-9 rounded-full bg-slate-300/80 dark:bg-slate-600/80"></span>
            </div>

            <header class="flex items-center gap-2.5 px-5 pt-2.5 pb-3">
                <h2 class="text-[15px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">Notes</h2>
                {#if noteCount > 0}
                    <span class="text-xs font-medium text-slate-400 dark:text-slate-500">{noteCount}</span>
                {/if}
                <div class="ml-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        class="flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        onclick={() => void addNote()}
                        data-testid="notes-new"
                    >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14" />
                        </svg>
                        New note
                    </button>
                    <button
                        type="button"
                        class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        aria-label="Close notes"
                        onclick={closeSheet}
                        data-testid="notes-close"
                    >
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                d="M6 6l12 12M18 6L6 18"
                            />
                        </svg>
                    </button>
                </div>
            </header>

            <div
                class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-0.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
                {#if noteCount === 0}
                    <div
                        class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700/70"
                    >
                        <svg
                            class="h-7 w-7 text-slate-300 dark:text-slate-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M7 3.75h7.5L19 8.25V19a1.25 1.25 0 0 1-1.25 1.25H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75Z"
                            />
                            <path
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linejoin="round"
                                d="M14.25 3.9V8.25H18.6"
                            />
                            <path
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                d="M8.75 12h6.5M8.75 15.5h4.5"
                            />
                        </svg>
                        <p class="max-w-[15rem] text-sm text-slate-500 dark:text-slate-400">
                            No notes yet. Jot down a thought before it slips away.
                        </p>
                        <button
                            type="button"
                            class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            onclick={() => void addNote()}
                        >
                            Jot a note
                        </button>
                    </div>
                {:else}
                    <ul class="flex flex-col gap-2.5">
                        {#each notes as note, index (note.id)}
                            <li class="note-stack-item" style:--tilt={`${index % 2 === 0 ? -0.4 : 0.4}deg`}>
                                <StickyNote
                                    {note}
                                    variant="card"
                                    autoFocus={note.id === appState.composeNoteId}
                                    onFocused={clearCompose}
                                    {onDeleted}
                                />
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    /* A gentle alternating tilt gives the sheet its "pile of stickies" feel. */
    .note-stack-item {
        transform: rotate(var(--tilt, 0deg));
        transition: transform 180ms ease;
    }

    .note-stack-item:focus-within {
        transform: rotate(0deg);
    }

    @media (prefers-reduced-motion: reduce) {
        .note-stack-item,
        .note-stack-item:focus-within {
            transition: none;
            transform: none;
        }
    }
</style>
