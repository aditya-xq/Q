<script lang="ts">
    import { createNote } from '$lib/stores/notes'
</script>

<!-- Desktop affordance above the home quote; mobile uses the notes button instead. -->
<button
    type="button"
    class="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-slate-400 shadow-sm backdrop-blur-sm transition hover:text-slate-600 hover:shadow dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500 dark:hover:text-slate-300"
    onclick={() => void createNote()}
    aria-label="Create a sticky note"
    data-testid="sticky-note-hint"
>
    <span>
        <kbd class="rounded border border-slate-300/70 px-1 py-px text-[10px] dark:border-slate-700">Alt</kbd>
        + <kbd class="rounded border border-slate-300/70 px-1 py-px text-[10px] dark:border-slate-700">Q</kbd> to jot a note
    </span>
</button>
