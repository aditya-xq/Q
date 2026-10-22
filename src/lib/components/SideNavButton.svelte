<script lang="ts">
    import { Icon } from './shared'
    import type { View } from '$lib/state.svelte'

    interface Props {
        view: View
        label: string
        active: boolean
        isMobile: boolean
        emoji?: string
        onNavigate: (view: View) => void
    }

    let { view, label, active, isMobile, emoji, onNavigate }: Props = $props()
</script>

<button
    type="button"
    onclick={() => onNavigate(view)}
    aria-label={label}
    class="group rounded-lg border border-line
    bg-surface text-fg-muted
    shadow-sm hover:shadow-md hover:border-accent transition-all duration-300
    hover:scale-105 active:scale-95
    data-[active=true]:bg-accent-soft
    data-[active=true]:border-accent data-[active=true]:text-fg
    {isMobile ? 'w-full p-4 flex items-center gap-3' : 'p-2'}"
    data-active={active}
    aria-current={active ? 'page' : undefined}
    data-tooltip={isMobile ? null : label}
    data-tooltip-position="right"
>
    <span
        class="flex shrink-0 items-center justify-center text-fg transition-transform duration-300 group-hover:scale-110
        {isMobile ? 'h-9 w-9 text-2xl' : 'h-6 w-6 text-xl'}"
    >
        {#if emoji}
            {emoji}
        {:else}
            <Icon />
        {/if}
    </span>
    {#if isMobile}
        <span class="text-sm font-medium">{label.split('(')[0].trim()}</span>
    {/if}
</button>
