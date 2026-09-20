<script lang="ts">
    import { onDestroy } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import type { Note } from '$lib/utils/db'
    import { addNote, createNote } from '$lib/stores/notes'
    import StickyNote from './StickyNote.svelte'

    interface UndoEntry {
        note: Note
        timer: ReturnType<typeof setTimeout>
    }

    let undoStack = $state<UndoEntry[]>([])

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
            text: entry.note.text,
            done: entry.note.done,
            color: entry.note.color,
            x: entry.note.x,
            y: entry.note.y,
            rotation: entry.note.rotation,
            pinned: entry.note.pinned,
        })
    }

    function clearCompose() {
        appState.composeNoteId = undefined
    }

    onDestroy(() => {
        for (const entry of undoStack) clearTimeout(entry.timer)
    })
</script>

{#each appState.notes as note (note.id)}
    <StickyNote
        {note}
        autoFocus={note.id === appState.composeNoteId}
        onFocused={clearCompose}
        onDeleted={handleDeleted}
    />
{/each}

{#if appState.notes.length === 0 && undoStack.length === 0}
    <button
        type="button"
        class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-slate-200/70 bg-white/60 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-slate-400 shadow-sm backdrop-blur-sm transition hover:text-slate-600 hover:shadow dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500 dark:hover:text-slate-300"
        onclick={() => void createNote()}
        aria-label="Create a sticky note"
        data-testid="sticky-note-hint"
    >
        <span class="hidden sm:inline">
            Press <kbd class="rounded border border-slate-300/70 px-1 py-px text-[10px] dark:border-slate-700">Alt</kbd>
            + <kbd class="rounded border border-slate-300/70 px-1 py-px text-[10px] dark:border-slate-700">Q</kbd> to jot
            a note
        </span>
        <span class="sm:hidden">Tap to jot a note</span>
    </button>
{/if}

{#if undoStack.length > 0}
    <div
        class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
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
