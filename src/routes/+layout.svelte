<script lang="ts">
    import { Links, QuickTodo, Settings } from '$lib/components'
    import { cubicOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import '../app.css'
    import { onDestroy, onMount } from 'svelte'
    import { appState, updateView } from '$lib/state.svelte'
    import { getAllSettings } from '$lib/utils/db'
    let { children } = $props()
    let handleKey: (e: KeyboardEvent) => void
    let isLoading = $state(true)

    onMount(async () => {
        handleKey = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'q') updateView('quick-panel')
            else if (e.altKey && e.key.toLowerCase() === 'p') updateView('projects')
            else if (e.altKey && e.key.toLowerCase() === 'w') updateView('writer')
            else if (e.altKey && e.key.toLowerCase() === 'm') updateView('finance')
            else if (e.altKey && e.key.toLowerCase() === 'g') updateView('games')
        }

        window.addEventListener('keydown', handleKey)        

        // Load all settings at once
        const settings = await getAllSettings()
        appState.keepQuickPanelOpen = settings.keepQuickPanelOpen as boolean ?? false
        appState.showQuote = settings.showQuote as boolean ?? true
        appState.showWeather = settings.showWeather as boolean ?? true

        isLoading = false
    })

    // At top level
    onDestroy(() => {
        if (handleKey) {
            window.removeEventListener('keydown', handleKey)
        }
    })
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Tab</title>
    <meta charset="UTF-8" />
</svelte:head>

<!-- ===== Layout Container ===== -->
<div class="flex h-screen text-slate-900 dark:text-slate-100 overflow-hidden bg-slate-50 dark:bg-slate-950">
    <!-- Top-Left Minimal "Queue" Label -->
    <div class="fixed top-4 left-20 z-40 select-none font-light text-xl tracking-wide text-slate-400 dark:text-slate-600">
        Queue 
    </div>
    <!-- Sidebar / Floating QuickTodo -->
    <div
        class="fixed left-0 top-0 h-full w-16 z-50 flex flex-col items-center pt-4 pb-6 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-xl"
        in:slide={{ axis: 'x', duration: 400, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 300 }}
    >
        <QuickTodo />
        <Settings />
    </div>
    <Links />
    <!-- Main Content Wrapper -->
    <main class="flex-1 ml-16 overflow-y-auto relative transition-all duration-300">
        {#if !isLoading}
            {@render children()}
        {/if}
    </main>
</div>
