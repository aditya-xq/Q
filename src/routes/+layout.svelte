<script lang="ts">
    import { Links, Settings, SideNav, ThemeDesigner } from '$lib/components'
    import { cubicOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import '../app.css'
    import { onDestroy, onMount } from 'svelte'
    import { appState, updateView } from '$lib/state.svelte'
    import { getAllSettings } from '$lib/utils/db'
    import { observeProjects } from '$lib/utils/stores'
    import { observeWriteups } from '$lib/stores/writeups'
    import { createNote, observeNotes } from '$lib/stores/notes'
    import { observeQuickLinks } from '$lib/stores/quicklinks'
    import { destroyTheme, initTheme, toggleThemeDesigner } from '$lib/stores/theme'
    import { findQuickLinkForShortcut, isShortcutBlocked, openQuickLink } from '$lib/utils/shortcuts'

    let { children } = $props()
    let handleKey: ((e: KeyboardEvent) => void) | undefined
    let subscriptions: { unsubscribe: () => void }[] = []

    onMount(() => {
        handleKey = (e: KeyboardEvent) => {
            if (e.repeat) return
            const key = e.key.toLowerCase()
            if (e.altKey) {
                // The theme designer is modal: keep the view shortcuts from firing behind it.
                if (appState.themeDesignerOpen && key !== 'a') return
                if (key === 'q') {
                    if (appState.view !== 'home') updateView('home')
                    void createNote()
                } else if (key === 'p') {
                    updateView('projects')
                } else if (key === 'w') {
                    updateView('writer')
                } else if (key === 'a') {
                    toggleThemeDesigner()
                }
                return
            }
            // Bare letters open the configured link for their category, but never while
            // typing, composing, holding a modifier, or a dialog/panel owns the keyboard.
            if (isShortcutBlocked(e)) return
            const link = findQuickLinkForShortcut(appState.quickLinks, e.key)
            if (link) openQuickLink(link.url)
        }

        window.addEventListener('keydown', handleKey)

        // Keep global state in sync across tabs and mutations.
        subscriptions = [observeProjects(), observeWriteups(), observeNotes(), observeQuickLinks()]
        void initTheme()

        void getAllSettings().then((settings) => {
            appState.showQuote = (settings.showQuote as boolean) ?? true
            appState.showWeather = (settings.showWeather as boolean) ?? false
        })
    })

    onDestroy(() => {
        if (handleKey) window.removeEventListener('keydown', handleKey)
        for (const subscription of subscriptions) subscription.unsubscribe()
        destroyTheme()
    })
</script>

<svelte:head>
    <title>New Tab</title>
</svelte:head>

<!-- ===== Layout Container ===== -->
<div class="flex h-dvh overflow-hidden text-fg">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <!-- Top-Left Minimal "Queue" Label -->
    <div class="fixed top-4 left-16 md:left-20 z-40 select-none font-light text-lg tracking-wide text-fg-muted">
        <span>Queue</span>
        <span class="ml-1 align-baseline text-[0.65rem] tracking-wide tabular-nums">
            v{__APP_VERSION__}
        </span>
    </div>
    <!-- Sidebar / Floating Navigation -->
    <nav
        aria-label="Primary"
        class={`fixed left-0 md:top-0 h-full md:w-16 z-51 flex flex-col items-center pt-4 pb-6 
            md:border-r border-line shadow-xl`}
        in:slide={{ axis: 'x', duration: 400, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 300 }}
    >
        <SideNav />
    </nav>
    <Settings />
    <Links />
    <ThemeDesigner />
    <!-- Main Content Wrapper -->
    <main
        id="main-content"
        tabindex="-1"
        class="flex-1 md:ml-16 md:mr-16 overflow-y-auto relative transition-all duration-300"
    >
        {@render children()}
    </main>
</div>
