<script lang="ts">
    import { Links, Settings, SideNav, ThemeDesigner } from '$lib/components'
    import '../app.css'
    import { onDestroy, onMount } from 'svelte'
    import { appState, updateView } from '$lib/state.svelte'
    import { getAllSettings } from '$lib/utils/db'
    import { observeProjects } from '$lib/utils/stores'
    import { observeWriteups } from '$lib/stores/writeups'
    import { createNote, observeNotes } from '$lib/stores/notes'
    import { observeQuickLinks } from '$lib/stores/quicklinks'
    import { destroyTheme, initTheme, toggleThemeDesigner } from '$lib/stores/theme'
    import { toast } from '$lib/utils/notification'
    import {
        SHORTCUT_SEQUENCE_TIMEOUT_MS,
        buildQuickLinkShortcutIndex,
        findQuickLinkForSequence,
        isShortcutBlocked,
        openQuickLink,
    } from '$lib/utils/shortcuts'

    let { children } = $props()
    let handleKey: ((e: KeyboardEvent) => void) | undefined
    let subscriptions: { unsubscribe: () => void }[] = []

    // A bare prefix with numbered alternatives waits briefly for a digit suffix.
    let pendingPrefix: { key: string; timer: ReturnType<typeof setTimeout> } | null = null

    function clearPendingPrefix() {
        if (!pendingPrefix) return
        clearTimeout(pendingPrefix.timer)
        pendingPrefix = null
    }

    function openSequence(sequence: string) {
        const link = findQuickLinkForSequence(appState.quickLinks, sequence)
        if (link) openQuickLink(link.url)
    }

    onMount(() => {
        handleKey = (e: KeyboardEvent) => {
            if (e.repeat) return
            const key = e.key.toLowerCase()
            if (e.altKey) {
                clearPendingPrefix()
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
            // Bare letters open the configured link named after them, but never while
            // typing, composing, holding a modifier, or a dialog/panel owns the keyboard.
            if (isShortcutBlocked(e)) {
                clearPendingPrefix()
                return
            }

            const { bySequence, ambiguousPrefixes } = buildQuickLinkShortcutIndex(appState.quickLinks)

            if (pendingPrefix) {
                const prefix = pendingPrefix.key
                clearPendingPrefix()
                if (/^[0-9]$/.test(key)) {
                    const link = bySequence.get(`${prefix}${key}`)
                    if (link) {
                        openQuickLink(link.url)
                        return
                    }
                }
                // Any other key abandons the pending prefix; handle it fresh below.
            }

            const link = bySequence.get(key)
            if (!link) return

            if (!ambiguousPrefixes.has(key)) {
                openQuickLink(link.url)
                return
            }

            pendingPrefix = {
                key,
                timer: setTimeout(() => {
                    pendingPrefix = null
                    openSequence(key)
                }, SHORTCUT_SEQUENCE_TIMEOUT_MS),
            }
        }

        window.addEventListener('keydown', handleKey)
        // A pointer press or lost focus cancels an unfinished prefix sequence.
        window.addEventListener('pointerdown', clearPendingPrefix)
        window.addEventListener('blur', clearPendingPrefix)

        // Keep global state in sync across tabs and mutations.
        subscriptions = [observeProjects(), observeWriteups(), observeNotes(), observeQuickLinks()]
        void initTheme()

        void getAllSettings()
            .then((settings) => {
                appState.showQuote = (settings.showQuote as boolean) ?? true
                appState.showWeather = (settings.showWeather as boolean) ?? false
                appState.showMarkets = (settings.showMarkets as boolean) ?? false
                appState.marketsRegion = (settings.marketsRegion as string) ?? 'auto'
                appState.marketSymbols = (settings.marketSymbols as string) ?? ''
            })
            .catch((error) => {
                console.error('Failed to load settings:', error)
                toast.error('Could not load saved settings')
            })
    })

    onDestroy(() => {
        clearPendingPrefix()
        if (typeof window !== 'undefined') {
            window.removeEventListener('pointerdown', clearPendingPrefix)
            window.removeEventListener('blur', clearPendingPrefix)
            if (handleKey) window.removeEventListener('keydown', handleKey)
        }
        for (const subscription of subscriptions) subscription.unsubscribe()
        destroyTheme()
    })
</script>

<svelte:head>
    <title>Q</title>
</svelte:head>

<!-- ===== Layout Container ===== -->
<div class="flex h-dvh overflow-hidden text-fg">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <!-- Top-Left Minimal "Queue" Label -->
    <div class="fixed top-4 left-16 md:left-20 z-40 select-none font-light text-lg tracking-wide text-fg-muted">
        <span>Queue</span>
        <span class="-ml-px align-baseline text-[0.65rem] tracking-tight tabular-nums">
            v{__APP_VERSION__}
        </span>
    </div>
    <!-- Sidebar / Floating Navigation -->
    <nav
        aria-label="Primary"
        class={`fixed left-0 md:top-0 h-full md:w-16 z-51 flex flex-col items-center pt-4 pb-6 
            md:border-r border-line shadow-xl`}
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
