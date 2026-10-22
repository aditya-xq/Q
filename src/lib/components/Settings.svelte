<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { setSetting, type QuickLink } from '$lib/utils/db'
    import { appState } from '$lib/state.svelte'
    import { CATEGORY_CONFIGS, DEFAULT_QUICK_LINKS, normalizeUrl } from '$lib/utils/constants'
    import { getQuickLinkByCategory, upsertQuickLink } from '$lib/stores/quicklinks'
    import { openThemeDesigner } from '$lib/stores/theme'
    import { CloseButton, ModeControl } from './shared'
    import { hasPermission, isExtensionContext, requestPermission } from '$lib/utils/browser'
    import { quintOut } from 'svelte/easing'
    import { fly, slide } from 'svelte/transition'

    const categoryConfigs = CATEGORY_CONFIGS

    let quickLinks = $state<QuickLink[]>(DEFAULT_QUICK_LINKS.map((link) => ({ ...link })))
    let savingState = $state(Array(categoryConfigs.length).fill(false))
    let savedState = $state(Array(categoryConfigs.length).fill(false))
    let saveTimeouts: (ReturnType<typeof setTimeout> | null)[] = Array(categoryConfigs.length).fill(null)
    let customUrls = $state(Array(categoryConfigs.length).fill(''))
    let showSettings = $state(false)
    let panelEl = $state<HTMLElement | undefined>(undefined)

    const hasUnsavedChanges = $derived(savingState.some(Boolean) || savedState.some(Boolean))

    let handleKey: ((e: KeyboardEvent) => void) | undefined
    let handleClickOutside: ((e: MouseEvent) => void) | undefined

    async function loadSettings() {
        const stored = await Promise.all(categoryConfigs.map((config) => getQuickLinkByCategory(config.title)))

        stored.forEach((link, index) => {
            if (!link) return
            const predefinedApps = categoryConfigs[index].apps.filter((app) => app !== 'Other')
            if (predefinedApps.includes(link.name)) {
                quickLinks[index] = link
                customUrls[index] = ''
            } else {
                quickLinks[index] = { ...link, name: 'Other' }
                customUrls[index] = link.url
            }
        })
    }

    onMount(() => {
        handleKey = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 's' && !appState.themeDesignerOpen) toggleSettingsView()
            if (e.key === 'Escape' && showSettings && !appState.themeDesignerOpen) showSettings = false
        }
        handleClickOutside = (e: MouseEvent) => {
            if (panelEl && !panelEl.contains(e.target as Node)) {
                showSettings = false
            }
        }
        window.addEventListener('keydown', handleKey)
        window.addEventListener('mousedown', handleClickOutside)
        void loadSettings()
    })

    onDestroy(() => {
        if (typeof window === 'undefined') return
        if (handleKey) window.removeEventListener('keydown', handleKey)
        if (handleClickOutside) window.removeEventListener('mousedown', handleClickOutside)
    })

    async function saveRow(index: number) {
        savingState[index] = true
        savedState[index] = false

        const row = { ...quickLinks[index] }

        if (row.name === 'Other') {
            const trimmedUrl = customUrls[index]?.trim() || ''
            if (!trimmedUrl) {
                savingState[index] = false
                return
            }
            row.url = normalizeUrl(trimmedUrl)
        }

        try {
            await upsertQuickLink(row)
            quickLinks[index] = row
            savedState[index] = true
            setTimeout(() => (savedState[index] = false), 1500)
        } catch (e) {
            console.error('Failed to save row', e)
        } finally {
            savingState[index] = false
        }
    }

    function scheduleRowSave(index: number) {
        if (saveTimeouts[index]) {
            clearTimeout(saveTimeouts[index]!)
        }
        saveTimeouts[index] = setTimeout(() => saveRow(index), 500)
    }

    function toggleSettingsView() {
        showSettings = !showSettings
    }

    function customizeTheme() {
        showSettings = false
        openThemeDesigner()
    }

    const ensureGeolocationPermission = async (): Promise<boolean> => {
        if (!isExtensionContext()) return true
        if (await hasPermission('geolocation')) return true
        try {
            return await requestPermission('geolocation')
        } catch (e) {
            console.error('Permissions request error:', e)
            return false
        }
    }

    async function toggleWidget(widget: 'showQuote' | 'showWeather') {
        const newVal = !appState[widget]
        if (widget === 'showWeather' && newVal) {
            const granted = await ensureGeolocationPermission()
            if (!granted) {
                console.warn('Geolocation permission not granted.')
                return
            }
        }
        await setSetting(widget, newVal)
        appState[widget] = newVal
    }

    function selectApp(index: number, app: string) {
        const config = categoryConfigs[index]
        quickLinks[index] = {
            ...quickLinks[index],
            name: app,
            url: app === 'Other' ? customUrls[index] || '' : config.urls[app] || '',
        }
        scheduleRowSave(index)
    }
</script>

<div
    class="fixed bottom-3 sm:bottom-5 left-2 sm:left-3 z-999"
    id="settings-panel"
    data-settings-panel
    data-shortcut-blocker={showSettings ? '' : undefined}
    bind:this={panelEl}
>
    {#if showSettings}
        <div
            class="absolute bottom-full mb-2 sm:mb-3 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2.5rem)] max-w-xl origin-bottom-left"
            in:fly={{ y: 10, duration: 300, easing: quintOut }}
            out:slide={{ axis: 'y', duration: 200 }}
        >
            <div class="overflow-hidden rounded-xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
                <!-- Header -->
                <div class="relative border-b border-line bg-surface/80 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 sm:gap-3">
                            <h1 class="text-base font-semibold text-fg sm:text-lg">Settings</h1>
                            {#if hasUnsavedChanges}
                                <div
                                    class="flex items-center gap-1 text-[10px] text-fg-subtle sm:gap-1.5 sm:text-xs"
                                    transition:slide={{ duration: 250, axis: 'x' }}
                                >
                                    {#if savingState.some(Boolean)}
                                        <span
                                            class="inline-block h-2 w-2 animate-spin rounded-full border-2 border-fg-subtle border-t-transparent sm:h-2.5 sm:w-2.5"
                                        ></span>
                                        <span>Saving...</span>
                                    {:else if savedState.some(Boolean)}
                                        <span class="text-success">✓</span>
                                        <span class="text-success">Saved</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <CloseButton label="Close settings" onclick={toggleSettingsView} />
                    </div>
                </div>

                <!-- Content -->
                <div class="max-h-[70dvh] space-y-3 overflow-y-auto p-3 sm:max-h-[75dvh] sm:space-y-4 sm:p-5">
                    <!-- Appearance -->
                    <section class="space-y-2 border-b border-line pb-3 sm:pb-4">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <div class="flex items-center gap-2 sm:min-w-32">
                                <span class="text-base sm:text-lg">🎨</span>
                                <h2
                                    class="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-fg-muted sm:text-sm"
                                >
                                    Appearance
                                </h2>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                                <ModeControl size="sm" />
                                <button
                                    type="button"
                                    class="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-muted transition hover:border-accent hover:text-accent-text sm:text-xs"
                                    onclick={customizeTheme}
                                >
                                    Customize theme…
                                </button>
                            </div>
                        </div>
                    </section>

                    <!-- Quick Links Categories -->
                    {#each categoryConfigs as config, index (config.title)}
                        <section class="space-y-2">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                <!-- Category Header -->
                                <div class="flex items-center gap-2 sm:min-w-32">
                                    <span class="text-base sm:text-lg">{config.icon}</span>
                                    <h2
                                        class="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-fg-muted sm:text-sm"
                                    >
                                        {config.title}
                                    </h2>
                                </div>

                                <!-- App Selection Buttons -->
                                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    {#each config.apps as app (app)}
                                        <button
                                            class={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3 sm:text-xs ${
                                                quickLinks[index].name === app
                                                    ? 'border-accent bg-accent-soft text-fg shadow-sm'
                                                    : 'border-line bg-surface-2/60 text-fg-muted hover:border-line-strong hover:text-fg'
                                            }`}
                                            aria-pressed={quickLinks[index].name === app}
                                            onclick={() => selectApp(index, app)}
                                        >
                                            {app}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Custom URL Input -->
                            {#if quickLinks[index].name === 'Other'}
                                <div class="mt-2 sm:pl-36" transition:slide={{ duration: 200 }}>
                                    <div class="relative">
                                        <input
                                            type="url"
                                            bind:value={customUrls[index]}
                                            placeholder="https://example.com"
                                            aria-label={`Custom ${config.title} URL`}
                                            class="w-full rounded-lg border border-line bg-surface-2/60 py-2 pl-3 pr-8 text-xs text-fg transition-all placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:py-2.5 sm:text-sm"
                                            oninput={() => scheduleRowSave(index)}
                                        />
                                        <div
                                            class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-subtle"
                                        >
                                            🔗
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </section>
                    {/each}

                    <!-- Widgets Toggle -->
                    <section class="border-t border-line pt-2 sm:pt-3">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <div class="flex items-center gap-2 sm:min-w-32">
                                <span class="text-base sm:text-lg">✨</span>
                                <h2
                                    class="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-fg-muted sm:text-sm"
                                >
                                    Widgets
                                </h2>
                            </div>

                            <div class="flex flex-wrap items-center gap-3 pl-6 sm:gap-4 sm:pl-0">
                                <!-- Quote Widget -->
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <p class="text-xs text-fg-muted sm:text-sm">Quote</p>
                                    <button
                                        onclick={() => toggleWidget('showQuote')}
                                        aria-pressed={appState.showQuote}
                                        aria-label="Toggle quote widget"
                                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none sm:h-6 sm:w-11
											{appState.showQuote ? 'bg-accent' : 'bg-surface-2'}"
                                    >
                                        <span
                                            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 sm:h-5 sm:w-5
											{appState.showQuote ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}"
                                        ></span>
                                    </button>
                                </div>

                                <!-- Weather Widget -->
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <p class="text-xs text-fg-muted sm:text-sm">Weather</p>
                                    <button
                                        onclick={() => toggleWidget('showWeather')}
                                        aria-pressed={appState.showWeather}
                                        aria-label="Toggle weather widget"
                                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none sm:h-6 sm:w-11
											{appState.showWeather ? 'bg-accent' : 'bg-surface-2'}"
                                    >
                                        <span
                                            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 sm:h-5 sm:w-5
											{appState.showWeather ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}"
                                        ></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    {/if}

    <!-- Settings Button -->
    <button
        onclick={toggleSettingsView}
        aria-label="Settings (Alt + S)"
        aria-expanded={showSettings}
        aria-controls="settings-panel"
        data-tooltip="Settings (Alt + S)"
        data-tooltip-position="right"
        class="group relative flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95
		   bg-surface text-fg-muted
		   {showSettings
            ? 'border-accent bg-accent-soft text-accent-text shadow-accent/20'
            : 'border-line hover:border-accent'}"
    >
        {#if showSettings}
            <div class="absolute inset-0 animate-pulse rounded-lg bg-accent/10"></div>
        {/if}
        <span class="relative block text-lg transition-transform duration-300 group-hover:rotate-90">⚙️</span>
    </button>
</div>

<style>
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
