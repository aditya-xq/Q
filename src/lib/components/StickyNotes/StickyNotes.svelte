<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import type { Note } from '$lib/utils/db'
    import { addNote, isStagedNote } from '$lib/stores/notes'
    import StickyNote from './StickyNote.svelte'
    import NoteStack from './NoteStack.svelte'

    interface UndoEntry {
        note: Note
        timer: ReturnType<typeof setTimeout>
    }

    let undoStack = $state<UndoEntry[]>([])
    let mounted = $state(false)
    let isMobile = $state(false)

    function checkMobile() {
        isMobile = window.innerWidth < 768 // md breakpoint
    }

    function handleDeleted(note: Note) {
        const timer = setTimeout(() => {
            undoStack = undoStack.filter((entry) => entry.timer !== timer)
        }, 6000)
        undoStack = [...undoStack, { note, timer }]
        while (undoStack.length > 5) {
            const dropped = undoStack.shift()
            if (dropped) clearTimeout(dropped.timer)
        }
    }

    async function undo() {
        const entry = undoStack[undoStack.length - 1]
        if (!entry) return
        clearTimeout(entry.timer)
        undoStack = undoStack.slice(0, -1)
        await addNote({
            // Clone out of the Svelte state proxy so IndexedDB can structured-clone it.
            points: entry.note.points.map((point) => ({ text: point.text, done: point.done })),
            color: entry.note.color,
            x: entry.note.x,
            y: entry.note.y,
            rotation: entry.note.rotation,
        })
    }

    function clearCompose() {
        appState.composeNoteId = undefined
    }

    onMount(() => {
        // Defer the responsive branch until after hydration so the server-rendered
        // markup always matches; notes arrive from Dexie at the same time anyway.
        mounted = true
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    })

    onDestroy(() => {
        for (const entry of undoStack) clearTimeout(entry.timer)
    })
</script>

{#if mounted}
    {#if isMobile}
        <NoteStack onDeleted={handleDeleted} />
    {:else}
        {#each appState.notes as note, index (note.id)}
            <StickyNote
                {note}
                autoFocus={note.id === appState.composeNoteId}
                staggerIndex={isStagedNote(note.id!) ? null : index}
                onFocused={clearCompose}
                onDeleted={handleDeleted}
            />
        {/each}
    {/if}
{/if}

{#if undoStack.length > 0}
    <div
        class="fixed bottom-24 left-1/2 z-[1200] flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200/80 bg-white/95 px-4 py-2 text-xs text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-16px_rgba(15,23,42,0.4)] backdrop-blur-md md:bottom-6 dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-300"
        role="status"
        data-testid="sticky-note-undo"
    >
        <span>{undoStack.length > 1 ? `${undoStack.length} notes dismissed` : 'Note dismissed'}</span>
        <button
            type="button"
            class="font-semibold text-sky-600 transition hover:text-sky-500 dark:text-sky-400"
            onclick={undo}
        >
            Undo
        </button>
    </div>
{/if}
