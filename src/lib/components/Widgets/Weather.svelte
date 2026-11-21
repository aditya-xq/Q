<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import {
        WEATHER_REFRESH_INTERVAL,
        ensureWeatherLoaded,
        refreshWeatherIfStale,
        stopWeather,
        weatherState,
    } from '$lib/stores/weather.svelte'
    import { untrack } from 'svelte'
    import { fly } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'

    // Rendering reads the module store, so returning to Home reuses the last reading
    // instead of refetching, and a load started before a view switch still completes.
    const weather = $derived(weatherState.data)
    const loading = $derived(weatherState.loading)
    const error = $derived(weatherState.error)

    const CARD_SURFACE =
        'rounded-2xl border border-line/60 bg-surface/85 px-3.5 py-3 shadow-xl backdrop-blur-xl transition-shadow duration-200 hover:shadow-2xl'
    const CARD_WIDTH = 'md:w-[var(--q-weather-width)]'

    function refresh() {
        void ensureWeatherLoaded(true, true)
    }

    // Single reactive entry point: fetch only while the widget is enabled,
    // and refresh stale data while the tab stays open.
    $effect(() => {
        if (!appState.showWeather) {
            stopWeather()
            return
        }
        // The store owns its own loading/fetch state; keep those reads out of the
        // effect's dependency set so a progress update cannot tear down the request.
        void untrack(() => ensureWeatherLoaded())

        const timer = setInterval(refreshWeatherIfStale, WEATHER_REFRESH_INTERVAL)
        document.addEventListener('visibilitychange', refreshWeatherIfStale)

        // Unmounting only detaches the listeners: an in-flight request finishes and
        // caches its result, so switching views never throws work away.
        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', refreshWeatherIfStale)
        }
    })
</script>

{#if appState.showWeather}
    <div
        class="z-[45] w-full md:fixed md:top-6 md:right-24 md:left-auto md:w-auto"
        data-testid="weather-widget"
        in:fly={{ y: -16, duration: 300, easing: cubicOut }}
        out:fly={{ y: -16, duration: 300, easing: cubicOut }}
    >
        {#if loading}
            <div class={`w-full ${CARD_WIDTH} ${CARD_SURFACE}`} role="status" data-testid="weather-loading">
                <span class="sr-only">Loading weather…</span>
                <div class="flex animate-pulse items-center justify-between gap-1" aria-hidden="true">
                    <div class="flex items-center gap-2">
                        <div class="h-2.5 w-20 rounded-sm bg-surface-2"></div>
                        <div class="h-4 w-8 rounded-sm bg-surface-2"></div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="h-6 w-6 rounded-full bg-surface-2"></div>
                        <div class="flex flex-col gap-0.5">
                            <div class="h-6 w-12 rounded-sm bg-surface-2"></div>
                            <div class="h-2.5 w-16 rounded-sm bg-surface-2"></div>
                        </div>
                    </div>
                    <div class="hidden w-13 shrink-0 flex-col items-center gap-1.5 md:flex">
                        <div class="h-2 w-10 rounded-sm bg-surface-2"></div>
                        <div class="h-1.5 w-full rounded-full bg-surface-2"></div>
                        <div class="h-2 w-8 rounded-sm bg-surface-2"></div>
                    </div>
                    <div class="hidden shrink-0 items-center gap-1.5 md:flex">
                        <div class="h-3.5 w-3.5 rounded-full bg-surface-2"></div>
                        <div class="h-4 w-8 rounded-sm bg-surface-2"></div>
                    </div>
                </div>
                <div
                    class="mt-3 flex animate-pulse items-center justify-between border-t border-line pt-3 md:hidden"
                    aria-hidden="true"
                >
                    <div class="h-2.5 w-20 rounded-sm bg-surface-2"></div>
                    <div class="flex items-center gap-3">
                        <div class="h-2.5 w-14 rounded-sm bg-surface-2"></div>
                        <div class="h-2.5 w-10 rounded-sm bg-surface-2"></div>
                    </div>
                </div>
            </div>
        {:else if weather}
            <!-- Mobile Layout (< md) -->
            <div class={`w-full ${CARD_SURFACE} md:hidden`}>
                <!-- Top Row: Location & Temp -->
                <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="max-w-40 truncate text-xs font-black uppercase tracking-wide text-fg">
                            {weather.location}
                        </span>
                        <span
                            class="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide {weather.vibe ===
                            'Warm'
                                ? 'bg-warning-soft text-warning'
                                : 'bg-accent-soft text-accent-text'}"
                        >
                            {weather.vibe}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-2xl leading-none">{weather.icon}</span>
                        <span class="text-2xl font-black leading-none tabular-nums text-fg">{weather.temp}°</span>
                    </div>
                </div>

                <!-- Bottom Row: Condition, AQI, Humidity -->
                <div class="flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span class="text-xs font-bold capitalize text-fg-muted">{weather.condition}</span>

                    <div class="flex items-center gap-3">
                        {#if weather.aqi}
                            <div class="flex items-center gap-1.5" data-testid="weather-aqi">
                                <div class="h-2 w-2 rounded-full" style:background-color={weather.aqi.color}></div>
                                <span class="text-xs font-bold" style:color={weather.aqi.color}>
                                    AQI {weather.aqi.value}
                                </span>
                            </div>
                        {/if}

                        <!-- Humidity -->
                        <div class="flex items-center gap-1.5">
                            <svg class="h-3 w-3 text-accent-text" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z" />
                            </svg>
                            <span class="text-xs font-bold tabular-nums text-fg">{weather.humidity}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Desktop Layout (≥ md) -->
            <div
                class={`hidden ${CARD_WIDTH} items-center justify-between gap-2.5 ${CARD_SURFACE} md:flex`}
                data-testid="weather-card"
            >
                <!-- Location & Vibe -->
                <div class="flex min-w-0 items-center gap-2 border-r border-line-strong/70 pr-2">
                    <span class="min-w-0 truncate whitespace-nowrap text-xs font-black uppercase tracking-wide text-fg">
                        {weather.location}
                    </span>
                    <span
                        class="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide {weather.vibe ===
                        'Warm'
                            ? 'bg-warning-soft text-warning'
                            : 'bg-accent-soft text-accent-text'}"
                    >
                        {weather.vibe}
                    </span>
                </div>

                <!-- Temperature -->
                <div class="flex shrink-0 items-center gap-2">
                    <span class="text-xl leading-none">{weather.icon}</span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <span class="text-lg font-black leading-none tabular-nums text-fg">{weather.temp}°</span>
                        <span
                            class="max-w-[5rem] truncate text-[8px] font-bold uppercase leading-none tracking-wide text-fg-muted"
                            >{weather.condition}</span
                        >
                    </div>
                </div>

                <!-- AQI -->
                {#if weather.aqi}
                    <div class="flex w-16 shrink-0 flex-col items-center gap-1.5" data-testid="weather-aqi">
                        <span
                            class="text-[9px] font-black uppercase leading-none tracking-wide"
                            style:color={weather.aqi.color}
                        >
                            AQI {weather.aqi.value}
                        </span>
                        <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                                class="h-full rounded-full transition-all duration-300"
                                style:background-color={weather.aqi.color}
                                style:width="{weather.aqi.percent}%"
                            ></div>
                        </div>
                        <span class="text-[8px] font-bold uppercase tracking-wide" style:color={weather.aqi.color}>
                            {weather.aqi.category}
                        </span>
                    </div>
                {/if}

                <!-- Humidity -->
                <div class="flex shrink-0 items-center gap-1.5 border-l border-line-strong/70 pl-3">
                    <svg
                        class="h-3.5 w-3.5 text-accent-text"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z" />
                    </svg>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-sm font-black leading-none tabular-nums text-fg">{weather.humidity}%</span>
                        <span class="text-[7px] font-bold uppercase leading-none tracking-wide text-fg-muted"
                            >Humidity</span
                        >
                    </div>
                </div>
            </div>
        {:else if error}
            <div
                class={`flex w-full ${CARD_WIDTH} items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger-soft px-3 py-2 text-danger shadow-lg backdrop-blur-xl`}
                data-testid="weather-error"
            >
                <span class="text-[11px] font-bold">⚠️ {error}</span>
                <button
                    onclick={refresh}
                    class="text-[11px] font-bold underline transition hover:no-underline"
                    aria-label="Retry weather">Retry</button
                >
            </div>
        {/if}
    </div>
{/if}
