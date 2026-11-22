<script lang="ts">
    import { onMount } from 'svelte'
    import { ensureQuoteEntry, quoteState, showNextQuote } from '$lib/stores/quote.svelte'

    const entry = $derived(quoteState.entry)

    onMount(() => ensureQuoteEntry())
</script>

{#if entry}
    <div class="max-w-lg mx-auto">
        <blockquote class="text-left">
            <p class="text-base md:text-xl text-fg-subtle" aria-live="polite">
                {entry.text}
            </p>
            <footer class="flex items-center justify-end gap-2">
                <cite class="min-w-0 text-sm md:text-lg text-fg-subtle italic">
                    — {entry.author ?? entry.source}{#if entry.author}
                        · {entry.source}{/if}
                </cite>
                <button
                    type="button"
                    class="shrink-0 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-accent-text"
                    aria-label="Show another quote or fact"
                    onclick={showNextQuote}
                >
                    <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                        <path d="M21 3v6h-6" />
                    </svg>
                </button>
            </footer>
        </blockquote>
    </div>
{/if}
