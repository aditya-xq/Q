<script lang="ts">
    import { QuickTodo, Settings } from '$lib/components'
    import { cubicOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import '../app.css'
    import { onDestroy, onMount } from 'svelte'
    import { appState } from '$lib/state.svelte'
    let { children } = $props()
    let handleKey: (e: KeyboardEvent) => void
    let isLoading = $state(true)

    function togglePanel() {
        if (appState.projectView) appState.projectView = false
        if (appState.settingsView) appState.settingsView = false
        if (appState.writerView) appState.writerView = false
        appState.isQuickPanelOpen = !appState.isQuickPanelOpen
    }

    function toggleProjectView() {
        if (appState.settingsView) appState.settingsView = false
        if (appState.writerView) appState.writerView = false
        appState.isQuickPanelOpen = false
        appState.projectView = !appState.projectView
    }

    function toggleWriteriew() {
        if (appState.settingsView) appState.settingsView = false
        appState.isQuickPanelOpen = false
        appState.writerView = !appState.writerView
    }

    function toggleSettingsView() {
        appState.settingsView = !appState.settingsView
    }

    onMount(async () => {
        handleKey = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'q') togglePanel()
            else if (e.altKey && e.key.toLowerCase() === 'p') toggleProjectView()
            else if (e.altKey && e.key.toLowerCase() === 'w') toggleWriteriew()
            else if (e.altKey && e.key.toLowerCase() === 's') toggleSettingsView()
        }

        window.addEventListener('keydown', handleKey)        
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
    <!-- Main Content Wrapper -->
    <main class="flex-1 ml-16 overflow-y-auto relative transition-all duration-300">
        {#if !isLoading}
            {@render children()}
        {/if}
    </main>
</div>
