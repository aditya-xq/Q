<script lang="ts">
    import { FrequentSites, GameDashboard, Notification, ProjectGrid, Quote, Weather, WriterView, FireDashboard } from '$lib/components'
    import { appState, type View } from '$lib/state.svelte'
    import { onMount } from 'svelte'
    import { fade, fly } from 'svelte/transition'
    import { cubicOut, quintOut } from 'svelte/easing'

    let frequentSites = $state<{ url: string; title: string }[]>([])
    const validViews = new Set<View>(['home', 'quick-panel', 'projects', 'writer', 'games', 'finance'])

    function getViewFromUrl(url: URL): View {
        const viewParam = url.searchParams.get('view')
        if (!viewParam) return 'home'
        const normalized = viewParam.toLowerCase() as View
        return validViews.has(normalized) ? normalized : 'home'
    }

    function syncViewFromUrl() {
        if (typeof window === 'undefined') return
        const nextView = getViewFromUrl(new URL(window.location.href))
        if (appState.view !== nextView) {
            appState.view = nextView
        }
    }

    onMount(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)

        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => document.documentElement.classList.toggle('dark', e.matches))

        if (chrome?.topSites?.get) {
            chrome.topSites.get((sites: any) => {
                frequentSites = sites.slice(0, 8)
            })
        } else {
            frequentSites = [
                { url: 'https://github.com', title: 'GitHub' },
                { url: 'https://youtube.com', title: 'YouTube' },
                { url: 'https://x.com', title: 'X' },
                { url: 'https://linkedin.com', title: 'LinkedIn' },
                { url: 'https://reddit.com', title: 'Reddit' },
                { url: 'https://chatgpt.com', title: 'ChatGPT' },
                { url: 'https://medium.com', title: 'Medium' },
                { url: 'https://netflix.com', title: 'Netflix' },
            ]
        }

        syncViewFromUrl()

        const handlePopState = () => syncViewFromUrl()
        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    })
</script>

<!-- ===== Main Screen ===== -->
<div class={`relative min-h-screen flex flex-col transition-colors duration-500 ${appState.view === 'projects' || appState.view === 'writer' ? 'items-start' : 'items-center justify-center'}`}>
    <!-- Notifications -->
    <Notification />
    <!-- App Views -->
    {#if appState.view !== 'home' && appState.view !== 'quick-panel'}
        <div
            class="w-full mx-auto transition-all duration-500 ease-out"
            style="opacity: 1;"
            in:fade={{ duration: 400, easing: cubicOut, delay: 200 }}
        >
            <div in:fly={{ y: 20, duration: 500, delay: 300, easing: quintOut }}>
                {#if appState.view === 'projects'}
                    <div class="mt-16"><ProjectGrid /></div>
                {:else if appState.view === 'writer'}
                    <div class="mt-20 mr-2 md:mr-16"><WriterView /></div>
                {:else if appState.view === 'games'}
                    <GameDashboard />
                {:else if appState.view === 'finance'}
                    <FireDashboard />
                {/if}
            </div>
        </div>
    {:else}
        <!-- Home View -->
        <div
            class={`flex flex-col items-center justify-center flex-1 w-full ${appState.showQuote ? '-mt-44' : '-mt-24'} md:mr-6 px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-out`}
            in:fade={{ duration: 400, easing: cubicOut }}
        >
            <div class={`${appState.view === 'quick-panel' || appState.keepQuickPanelOpen ? 'max-w-6xl pl-86' : 'max-w-3xl'} text-center space-y-8 transition-all duration-400 ease-in-out`}>
                <Weather />
                <div in:fly={{ y: 20, duration: 400, delay: 300, easing: cubicOut }}>
                    {#if appState.showQuote}<Quote />{/if}
                    <FrequentSites sites={frequentSites} />
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }

    /* Scrollbars (light & dark) */
    :global(::-webkit-scrollbar) {
        width: 8px;
    }
    :global(::-webkit-scrollbar-thumb) {
        border-radius: 4px;
        background-color: rgba(148, 163, 184, 0.4);
    }
    :global(.dark ::-webkit-scrollbar-thumb) {
        background-color: rgba(71, 85, 105, 0.5);
    }
</style>
