<script lang="ts">
    import { onDestroy } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import type { Note } from '$lib/utils/db'
    import { addNote, isStagedNote } from '$lib/stores/notes'
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

    onDestroy(() => {
        for (const entry of undoStack) clearTimeout(entry.timer)
    })
</script>

{#each appState.notes as note, index (note.id)}
    <StickyNote
        {note}
        autoFocus={note.id === appState.composeNoteId}
        staggerIndex={isStagedNote(note.id!) ? null : index}
        onFocused={clearCompose}
        onDeleted={handleDeleted}
    />
{/each}

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
