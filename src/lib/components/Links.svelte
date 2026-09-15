<script lang="ts">
    import { onMount } from 'svelte'
    import { liveQuery } from 'dexie'
    import type { QuickLink } from '$lib/utils/db'
    import {
        DEFAULT_QUICK_LINKS,
        FAVICON_FALLBACK,
        QUICK_LINK_CATEGORIES,
        extractNameFromUrl,
        getQuickLinkIcon,
    } from '$lib/utils/constants'
    import { getAllQuickLinks } from '$lib/stores/quicklinks'

    let quickLinks = $state<QuickLink[]>([])
    let isOpen = $state(false)

    function openLink(url: string) {
        if (!url) return
        window.location.href = url
        isOpen = false
    }

    onMount(() => {
        const subscription = liveQuery(async () => {
            const stored = await getAllQuickLinks()
            const filtered = stored.filter((link) =>
                (QUICK_LINK_CATEGORIES as readonly string[]).includes(link.category)
            )
            return filtered.length > 0 ? filtered : DEFAULT_QUICK_LINKS
        }).subscribe((links) => {
            quickLinks = QUICK_LINK_CATEGORIES.map((category) => {
                const link =
                    links.find((item) => item.category === category) ??
                    DEFAULT_QUICK_LINKS.find((item) => item.category === category)
                if (!link) return undefined
                if (link.name === 'Other' && link.url) {
                    return { ...link, name: extractNameFromUrl(link.url) }
                }
                return link
            }).filter((link): link is QuickLink => Boolean(link))
        })

        return () => subscription.unsubscribe()
    })
</script>

<!-- Desktop: Fixed sidebar on the right -->
<aside
    class="hidden md:flex fixed right-0 top-0 h-full w-16 z-50 flex-col items-center pt-4 pb-6
	   bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800
	   shadow-xl"
>
    <div class="fixed top-5 right-3.5 flex flex-col gap-3">
        {#each quickLinks as link (link.category)}
            <button
                class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
					bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
					shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
					hover:scale-105 active:scale-95"
                data-tooltip={link.name}
                onclick={() => openLink(link.url)}
                aria-label={link.name}
            >
                <img
                    src={getQuickLinkIcon(link.name, link.url)}
                    alt={link.name}
                    class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                    onerror={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = FAVICON_FALLBACK
                    }}
                />
            </button>
        {/each}
    </div>
</aside>

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
        class="fixed top-15 right-3 z-50 transition-all duration-300 ease-out origin-top-right"
        style:transform={isOpen ? 'scale(1)' : 'scale(0)'}
        style:opacity={isOpen ? '1' : '0'}
    >
        <div class="rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-50">
            <div class="grid grid-cols-2 gap-3">
                {#each quickLinks as link (link.category)}
                    <button
                        class="group flex flex-col items-center gap-1.5 p-4 rounded-xl
							bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700
							hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950
							transition-all duration-200 active:scale-95"
                        onclick={() => openLink(link.url)}
                        aria-label={link.name}
                    >
                        <img
                            src={getQuickLinkIcon(link.name, link.url)}
                            alt={link.name}
                            class="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
                            onerror={(e) => {
                                ;(e.currentTarget as HTMLImageElement).src = FAVICON_FALLBACK
                            }}
                        />
                        <span class="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
                            {link.name}
                        </span>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- Floating Toggle Button -->
    <button
        class="fixed top-3 right-3 z-50 w-10 h-10 rounded-full
			border-2 border-slate-300 dark:border-slate-600
			shadow-lg hover:shadow-xl active:shadow-md
			flex items-center justify-center
			transition-all duration-300 ease-out
			hover:scale-110 active:scale-95"
        onclick={() => (isOpen = !isOpen)}
        aria-label="Toggle quick links"
        style:transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
    >
        <span class="text-xl">🔗</span>
    </button>
</div>
