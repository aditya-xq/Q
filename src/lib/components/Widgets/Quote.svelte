<script lang="ts">
    import { onMount } from 'svelte'
    import { getRandomQuote, type Quote } from '$lib/data/quotes'

    let quote = $state<Quote | null>(null)

    onMount(() => {
        quote = getRandomQuote()
    })
</script>

{#if quote}
    <div class="max-w-lg mx-auto">
        <div>
            <blockquote class="text-left">
                <p class="text-base md:text-xl text-fg-subtle">
                    {quote.text}
                </p>
                {#if quote.author}
                    <footer class="text-end">
                        <cite class="text-sm md:text-lg text-fg-subtle italic">
                            — {quote.author}
                        </cite>
                    </footer>
                {/if}
            </blockquote>
        </div>
    </div>
{/if}
