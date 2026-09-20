<script lang="ts">
    import { Icon } from './shared'
    import type { View } from '$lib/state.svelte'

    interface Props {
        view: View
        label: string
        active: boolean
        isMobile: boolean
        square?: boolean
        emoji?: string
        onNavigate: (view: View) => void
    }

    let { view, label, active, isMobile, square = false, emoji, onNavigate }: Props = $props()
</script>

<button
    type="button"
    onclick={() => onNavigate(view)}
    aria-label={label}
    class="group rounded-lg border border-slate-200 dark:border-slate-700
    bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
    shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
    hover:scale-105 active:scale-95
    data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
    data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400
    {isMobile ? 'w-full p-4 flex items-center gap-3' : square ? 'p-0' : 'p-2'}"
    data-active={active}
    aria-current={active ? 'page' : undefined}
    data-tooltip={isMobile ? null : label}
    data-tooltip-position="right"
>
    <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110 {isMobile ? 'text-2xl' : ''}">
        {#if emoji}
            {emoji}
        {:else}
            <div class="w-9 h-9"><Icon /></div>
        {/if}
    </span>
    {#if isMobile}
        <span class="text-sm font-medium">{label.split('(')[0].trim()}</span>
    {/if}
</button>
