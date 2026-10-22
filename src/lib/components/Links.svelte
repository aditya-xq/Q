<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { FALLBACK_ICON, getFaviconUrl, getQuickLinkIcon, type QuickLinkCategory } from '$lib/utils/constants'
    import { QUICK_LINK_SHORTCUTS, openQuickLink } from '$lib/utils/shortcuts'

    let quickLinks = $derived(appState.quickLinks)
    let isOpen = $state(false)

    // Curated icons are local, so an error means a custom link's remote favicon failed.
    // Try the host's favicon once, then settle on the bundled placeholder.
    function onIconError(event: Event, url: string) {
        const img = event.currentTarget as HTMLImageElement
        if (img.dataset.fallback === 'placeholder') return
        const favicon = getFaviconUrl(url)
        // Unknown links already use the host favicon, so go straight to the placeholder.
        if (img.dataset.fallback === 'favicon' || img.src === favicon) {
            img.dataset.fallback = 'placeholder'
            img.src = FALLBACK_ICON
            return
        }
        img.dataset.fallback = 'favicon'
        img.src = favicon
    }

    function shortcutLabel(category: string): string | undefined {
        return QUICK_LINK_SHORTCUTS[category as QuickLinkCategory]?.toUpperCase()
    }

    function openLink(url: string) {
        if (openQuickLink(url)) isOpen = false
    }
</script>

<!-- Desktop: Fixed sidebar on the right -->
<aside
    aria-label="Quick links"
    class="hidden md:flex fixed right-0 top-0 h-full w-16 z-50 flex-col items-center pt-4 pb-6
	   bg-surface border-l border-line
	   shadow-xl"
>
    <div class="fixed top-5 right-3.5 flex flex-col gap-3">
        {#each quickLinks as link (link.category)}
            {@const shortcut = shortcutLabel(link.category)}
            <button
                class="group rounded-lg p-2 border border-line
					bg-surface text-fg-muted
					shadow-sm hover:shadow-md hover:border-accent hover:text-accent-text transition-all duration-300
					hover:scale-105 active:scale-95"
                data-tooltip={shortcut ? `${link.name} (${shortcut})` : link.name}
                onclick={() => openLink(link.url)}
                aria-label={link.name}
                aria-keyshortcuts={shortcut}
            >
                <img
                    src={getQuickLinkIcon(link.name, link.url)}
                    alt={link.name}
                    class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                    onerror={(event) => onIconError(event, link.url)}
                />
            </button>
        {/each}
    </div>
</aside>

<svelte:window
    onkeydown={(event) => {
        if (event.key === 'Escape' && isOpen) isOpen = false
    }}
/>

<!-- Mobile: Collapsible menu with floating button -->
<div class="md:hidden">
    <!-- Backdrop -->
    {#if isOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
            onclick={() => (isOpen = false)}
        ></div>
    {/if}

    <!-- Quick Links Menu -->
    <div
        id="quick-links-menu"
        role="group"
        aria-label="Quick links"
        class="fixed top-15 right-3 z-50 transition-all duration-300 ease-out origin-top-right"
        style:transform={isOpen ? 'scale(1)' : 'scale(0)'}
        style:opacity={isOpen ? '1' : '0'}
        data-shortcut-blocker={isOpen ? '' : undefined}
        inert={!isOpen}
        aria-hidden={!isOpen}
    >
        <div class="rounded-2xl border border-line bg-surface p-3 shadow-2xl min-w-50">
            <div class="grid grid-cols-2 gap-3">
                {#each quickLinks as link (link.category)}
                    {@const shortcut = shortcutLabel(link.category)}
                    <button
                        class="group flex flex-col items-center gap-1.5 p-4 rounded-xl
							bg-surface-2 border border-line
							hover:border-accent hover:bg-accent-soft
							transition-all duration-200 active:scale-95"
                        onclick={() => openLink(link.url)}
                        aria-label={link.name}
                        aria-keyshortcuts={shortcut}
                    >
                        <img
                            src={getQuickLinkIcon(link.name, link.url)}
                            alt={link.name}
                            class="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
                            onerror={(event) => onIconError(event, link.url)}
                        />
                        <span class="text-xs font-medium text-fg text-center leading-tight">
                            {link.name}
                        </span>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- Floating Toggle Button -->
    <button
        class="fixed top-3 right-3 z-50 w-10 h-10 rounded-lg
			border border-line bg-surface text-fg-muted
			shadow-lg hover:shadow-xl hover:border-accent hover:text-accent-text active:shadow-md
			flex items-center justify-center
			transition-all duration-300 ease-out
			hover:scale-105 active:scale-95"
        onclick={() => (isOpen = !isOpen)}
        aria-label="Toggle quick links"
        aria-expanded={isOpen}
        aria-controls="quick-links-menu"
        style:transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
    >
        <span class="text-xl">🔗</span>
    </button>
</div>
