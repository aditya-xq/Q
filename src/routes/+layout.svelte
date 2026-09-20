<script lang="ts">
    import { Links, Settings, SideNav } from '$lib/components'
    import { cubicOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import '../app.css'
    import { onDestroy, onMount } from 'svelte'
    import { appState, updateView } from '$lib/state.svelte'
    import { getAllSettings } from '$lib/utils/db'
    import { observeProjects } from '$lib/utils/stores'
    import { observeWriteups } from '$lib/stores/writeups'
    import { createNote, observeNotes } from '$lib/stores/notes'

    let { children } = $props()
    let handleKey: ((e: KeyboardEvent) => void) | undefined
    let subscriptions: { unsubscribe: () => void }[] = []

    onMount(() => {
        handleKey = (e: KeyboardEvent) => {
            if (!e.altKey || e.repeat) return
            const key = e.key.toLowerCase()
            if (key === 'q') {
                if (appState.view !== 'home') updateView('home')
                void createNote()
            } else if (key === 'p') {
                updateView('projects')
            } else if (key === 'w') {
                updateView('writer')
            }
        }

        window.addEventListener('keydown', handleKey)

        // Keep global state in sync across tabs and mutations.
        subscriptions = [observeProjects(), observeWriteups(), observeNotes()]

        void getAllSettings().then((settings) => {
            appState.showQuote = (settings.showQuote as boolean) ?? true
            appState.showWeather = (settings.showWeather as boolean) ?? false
        })
    })

    onDestroy(() => {
        if (handleKey) window.removeEventListener('keydown', handleKey)
        for (const subscription of subscriptions) subscription.unsubscribe()
    })
</script>

<svelte:head>
    <title>New Tab</title>
</svelte:head>

<!-- ===== Layout Container ===== -->
<div class="flex h-screen text-slate-900 dark:text-slate-100 overflow-hidden bg-slate-50 dark:bg-slate-950">
    <!-- Top-Left Minimal "Queue" Label -->
    <div
        class="fixed top-4 left-16 md:left-20 z-40 select-none font-light text-xl tracking-wide text-slate-400 dark:text-slate-600"
    >
        Queue
    </div>
    <!-- Sidebar / Floating Navigation -->
    <div
        class={`fixed left-0 md:top-0 h-full md:w-16 z-51 flex flex-col items-center pt-4 pb-6 
            md:border-r border-slate-200 dark:border-slate-800 shadow-xl`}
        in:slide={{ axis: 'x', duration: 400, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 300 }}
    >
        <SideNav />
    </div>
    <Settings />
    <Links />
    <!-- Main Content Wrapper -->
    <main class="flex-1 md:ml-16 overflow-y-auto relative transition-all duration-300">
        {@render children()}
    </main>
</div>
