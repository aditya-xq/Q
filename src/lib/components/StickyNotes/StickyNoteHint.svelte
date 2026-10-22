<script lang="ts">
    import { createNote } from '$lib/stores/notes'
</script>

<!-- Desktop affordance above the home quote; mobile uses the notes button instead. -->
<button
    type="button"
    class="hidden md:inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/60 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-fg-subtle shadow-sm backdrop-blur-sm transition hover:text-fg hover:shadow"
    onclick={() => void createNote()}
    aria-label="Create a sticky note"
    data-testid="sticky-note-hint"
>
    <span>
        <kbd class="rounded border border-line-strong/70 px-1 py-px text-[10px]">Alt</kbd>
        + <kbd class="rounded border border-line-strong/70 px-1 py-px text-[10px]">Q</kbd> to jot a note
    </span>
</button>
