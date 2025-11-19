<script lang="ts">
    import { FrequentSites, Links, Notification, ProjectGrid, WriterView } from '$lib/components'
    import { appState } from '$lib/state.svelte'
    import { onMount } from 'svelte'
    import { fade, fly } from 'svelte/transition'
    import { cubicOut, quintOut } from 'svelte/easing'

    let frequentSites: { url: string; title: string }[] = []

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
    })
</script>

<!-- ===== Main Screen ===== -->
<div
    class={`relative min-h-screen flex flex-col transition-colors duration-500 ${
        appState.projectView || appState.writerView ? 'items-start' : 'items-center justify-center'
    } bg-slate-50 dark:bg-slate-950`}
>
    <!-- Notifications -->
    <Notification />

    <!-- Top-right user links -->
    <div class="fixed top-4 right-4 z-30">
        <Links />
    </div>

    <!-- Project View -->
    {#if appState.projectView || appState.writerView}
        <div
            class="w-full max-w-7xl mx-auto transition-all duration-500 ease-out"
            style="opacity: 1;"
            in:fade={{ duration: 400, easing: cubicOut, delay: 200 }}
        >
            <div in:fly={{ y: 20, duration: 500, delay: 300, easing: quintOut }}>
                {#if appState.projectView}
                    <div class="mt-40"><ProjectGrid /></div>
                {:else if appState.writerView}
                    <div class="mt-18"><WriterView /></div>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Home View -->
        <div
            class="flex flex-col items-center justify-center flex-1 w-full -mt-24 px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-out"
            in:fade={{ duration: 400, easing: cubicOut }}
        >
            <div class="max-w-3xl w-full text-center space-y-8">
                <div in:fly={{ y: 20, duration: 400, delay: 300, easing: cubicOut }}>
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
