<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { setSetting, type QuickLink } from '$lib/utils/db'
    import { appState } from '$lib/state.svelte'
    import { CATEGORY_CONFIGS, DEFAULT_QUICK_LINKS, normalizeUrl } from '$lib/utils/constants'
    import { getQuickLinkByCategory, upsertQuickLink } from '$lib/stores/quicklinks'
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
            if (e.altKey && e.key.toLowerCase() === 's') toggleSettingsView()
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

<div class="fixed bottom-3 sm:bottom-5 left-2 sm:left-3 z-1000" data-settings-panel bind:this={panelEl}>
    {#if showSettings}
        <div
            class="absolute bottom-full mb-2 sm:mb-3 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2.5rem)] max-w-xl origin-bottom-left"
            in:fly={{ y: 10, duration: 300, easing: quintOut }}
            out:slide={{ axis: 'y', duration: 200 }}
        >
            <div
                class="bg-slate-800 dark:bg-slate-950 rounded-xl sm:rounded-2xl border border-slate-600 shadow-2xl overflow-hidden"
            >
                <!-- Header -->
                <div
                    class="relative bg-slate-800/80 dark:bg-slate-950 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-700"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 sm:gap-3">
                            <h1 class="text-base sm:text-lg font-semibold text-gray-100">Settings</h1>
                            {#if hasUnsavedChanges}
                                <div
                                    class="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-400"
                                    transition:slide={{ duration: 250, axis: 'x' }}
                                >
                                    {#if savingState.some(Boolean)}
                                        <span
                                            class="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
                                        ></span>
                                        <span>Saving...</span>
                                    {:else if savedState.some(Boolean)}
                                        <span class="text-green-400">✓</span>
                                        <span class="text-green-400">Saved</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <button
                            onclick={toggleSettingsView}
                            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 dark:bg-slate-950 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all"
                            aria-label="Close settings"
                        >
                            <span class="text-sm">✕</span>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-3 sm:p-5 max-h-[70vh] sm:max-h-[75vh] overflow-y-auto space-y-3 sm:space-y-4">
                    <!-- Quick Links Categories -->
                    {#each categoryConfigs as config, index (config.title)}
                        <section class="space-y-2">
                            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <!-- Category Header -->
                                <div class="flex items-center gap-2 sm:min-w-32">
                                    <span class="text-base sm:text-lg">{config.icon}</span>
                                    <h2
                                        class="text-xs sm:text-sm font-semibold text-gray-200 uppercase tracking-wide whitespace-nowrap"
                                    >
                                        {config.title}
                                    </h2>
                                </div>

                                <!-- App Selection Buttons -->
                                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    {#each config.apps as app (app)}
                                        <button
                                            class="px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap
												{quickLinks[index].name === app
                                                ? 'bg-white/20 border border-white/30 text-white shadow-lg shadow-white/5'
                                                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200'}
											"
                                            onclick={() => selectApp(index, app)}
                                        >
                                            {app}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Custom URL Input -->
                            {#if quickLinks[index].name === 'Other'}
                                <div class="sm:pl-36 mt-2" transition:slide={{ duration: 200 }}>
                                    <div class="relative">
                                        <input
                                            type="url"
                                            bind:value={customUrls[index]}
                                            placeholder="https://example.com"
                                            class="w-full px-3 py-2 sm:py-2.5 rounded-lg bg-white/5 text-gray-100 text-xs sm:text-sm
												border border-white/10 focus:border-white/30
												focus:outline-none focus:ring-2 focus:ring-white/10
												placeholder:text-gray-500 transition-all pr-8"
                                            oninput={() => scheduleRowSave(index)}
                                        />
                                        <div
                                            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none"
                                        >
                                            🔗
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </section>
                    {/each}

                    <!-- Widgets Toggle -->
                    <section class="pt-2 sm:pt-3 border-t border-slate-700">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <div class="flex items-center gap-2 sm:min-w-32">
                                <span class="text-base sm:text-lg">✨</span>
                                <h2
                                    class="text-xs sm:text-sm font-semibold text-gray-200 uppercase tracking-wide whitespace-nowrap"
                                >
                                    Widgets
                                </h2>
                            </div>

                            <div class="flex flex-wrap items-center gap-3 sm:gap-4 pl-6 sm:pl-0">
                                <!-- Quote Widget -->
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <p class="text-xs sm:text-sm text-gray-300">Quote</p>
                                    <button
                                        onclick={() => toggleWidget('showQuote')}
                                        aria-pressed={appState.showQuote}
                                        aria-label="Toggle quote widget"
                                        class="relative inline-flex items-center h-5 sm:h-6 rounded-full w-9 sm:w-11 transition-colors duration-200 focus:outline-none
											{appState.showQuote ? 'bg-sky-500' : 'bg-white/5'}"
                                    >
                                        <span
                                            class="absolute left-0.5 top-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white shadow transition-transform duration-200
											{appState.showQuote ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}"
                                        ></span>
                                    </button>
                                </div>

                                <!-- Weather Widget -->
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <p class="text-xs sm:text-sm text-gray-300">Weather</p>
                                    <button
                                        onclick={() => toggleWidget('showWeather')}
                                        aria-pressed={appState.showWeather}
                                        aria-label="Toggle weather widget"
                                        class="relative inline-flex items-center h-5 sm:h-6 rounded-full w-9 sm:w-11 transition-colors duration-200 focus:outline-none
											{appState.showWeather ? 'bg-sky-500' : 'bg-white/5'}"
                                    >
                                        <span
                                            class="absolute left-0.5 top-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white shadow transition-transform duration-200
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
        data-tooltip="Settings (Alt + S)"
        data-tooltip-position="right"
        class="group relative rounded-lg p-2 border
		   bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
		   shadow-lg hover:shadow-xl transition-all duration-300
		   hover:scale-110 active:scale-95
		   {showSettings
            ? 'border-sky-400 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 shadow-sky-400/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-sky-400'}"
    >
        {#if showSettings}
            <div class="absolute inset-0 rounded-xl bg-sky-400/10 animate-pulse"></div>
        {/if}
        <span class="relative block text-base transition-transform duration-300 group-hover:rotate-90">⚙️</span>
    </button>
</div>

<style>
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Custom scrollbar for settings panel */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: rgba(148, 163, 184, 0.3);
        border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background-color: rgba(148, 163, 184, 0.5);
    }
</style>
