<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { setThemeMode } from '$lib/stores/theme'
    import { MODE_OPTIONS } from '$lib/utils/theme'

    let { size = 'md' }: { size?: 'sm' | 'md' } = $props()
</script>

<div class="inline-flex w-max rounded-full border border-line bg-surface p-0.5" role="group" aria-label="Colour mode">
    {#each MODE_OPTIONS as option (option.id)}
        <button
            type="button"
            class={`rounded-full font-medium transition-colors ${
                size === 'sm' ? 'px-2.5 py-1 text-[11px] sm:text-xs' : 'px-3 py-2 text-xs'
            } ${
                appState.theme.mode === option.id ? 'bg-accent text-accent-fg shadow-sm' : 'text-fg-muted hover:text-fg'
            }`}
            aria-pressed={appState.theme.mode === option.id}
            onclick={() => setThemeMode(option.id)}
        >
            {option.label}
        </button>
    {/each}
</div>
