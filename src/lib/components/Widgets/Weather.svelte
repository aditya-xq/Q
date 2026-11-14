<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { hasPermission, isExtensionContext } from '$lib/utils/browser'
    import { isSessionCacheFresh, readSessionCache, writeSessionCache } from '$lib/utils/sessionCache'
    import { buildWeather, type Weather } from '$lib/utils/weather'
    import { untrack } from 'svelte'
    import { fly } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'

    let weather = $state<Weather | null>(null)
    let loading = $state(false)
    let error = $state<string | null>(null)
    let started = false
    let lastFetchedAt = 0
    let requestId = 0
    let controller: AbortController | null = null

    const CACHE_KEY = 'weather:status:v3'
    const CACHE_TTL = 15 * 60 * 1000
    const REFRESH_INTERVAL = 15 * 60 * 1000
    const CARD_SURFACE =
        'rounded-2xl border border-line/60 bg-surface/85 px-3.5 py-3 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl'
    const CARD_WIDTH = 'md:w-[var(--q-weather-width)]'

    function isCachedWeather(value: unknown): value is Weather {
        if (typeof value !== 'object' || value === null) return false
        const record = value as Record<string, unknown>
        return (
            typeof record.temp === 'number' &&
            typeof record.location === 'string' &&
            typeof record.condition === 'string'
        )
    }

    function stopRequest() {
        requestId += 1
        controller?.abort()
        controller = null
        loading = false
    }

    async function fetchWeatherData(lat: number, lon: number, id: number, signal: AbortSignal) {
        try {
            const [gRes, wRes, aRes] = await Promise.all([
                // api.bigdatacloud.net 307-redirects here; calling the canonical host avoids the extra hop
                fetch(
                    `https://api-bdc.io/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
                    { signal }
                ),
                fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
                    { signal }
                ),
                fetch(
                    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`,
                    { signal }
                ),
            ])

            if (!gRes.ok || !wRes.ok || !aRes.ok) {
                throw new Error('API request failed')
            }

            const [gData, wData, aData] = await Promise.all([gRes.json(), wRes.json(), aRes.json()])
            const current = wData.current
            if (!current) {
                throw new Error('No weather data available')
            }
            if (id !== requestId) return

            const result = buildWeather({
                temperature: current.temperature_2m,
                humidity: current.relative_humidity_2m ?? 0,
                weatherCode: current.weather_code,
                aqi: aData.current?.us_aqi ?? 0,
                location: gData.city || gData.locality || gData.countryName || 'Unknown',
                lat,
                lon,
            })

            writeSessionCache(CACHE_KEY, result)
            lastFetchedAt = Date.now()
            weather = result
            error = null
        } catch (e) {
            if (signal.aborted || id !== requestId) return
            console.error('Weather fetch error:', e)
            error = 'Service Unavailable'
        } finally {
            if (id === requestId) loading = false
        }
    }

    async function loadWeather(force = false) {
        if (loading && !force) return

        const cached = readSessionCache(CACHE_KEY, isCachedWeather)
        if (!force && cached) {
            weather = cached.data
            lastFetchedAt = cached.ts
            if (isSessionCacheFresh(cached, CACHE_TTL)) return
        }

        loading = !weather
        error = null

        const id = ++requestId
        controller?.abort()
        const requestController = new AbortController()
        controller = requestController

        if (!navigator.geolocation) {
            error = 'Geolocation not supported'
            loading = false
            return
        }

        let permitted = true
        if (isExtensionContext()) {
            try {
                permitted = await hasPermission('geolocation')
            } catch (permissionError) {
                console.error('Weather permission check failed:', permissionError)
                permitted = false
            }
        }
        if (!permitted) {
            if (id !== requestId) return
            error = 'Location Access Denied'
            loading = false
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (id !== requestId) return
                void fetchWeatherData(pos.coords.latitude, pos.coords.longitude, id, requestController.signal)
            },
            (err) => {
                if (id !== requestId) return
                console.error('Geolocation error:', err)
                error = 'Location Access Denied'
                loading = false
            },
            { timeout: 10000, maximumAge: 60000 }
        )
    }

    function refresh() {
        void loadWeather(true)
    }

    function refreshIfStale() {
        if (document.visibilityState !== 'visible') return
        if (Date.now() - lastFetchedAt >= CACHE_TTL) void loadWeather(true)
    }

    // Single reactive entry point: fetch only while the widget is enabled,
    // and refresh stale data while the tab stays open.
    $effect(() => {
        if (!appState.showWeather) {
            started = false
            stopRequest()
            return
        }
        if (started) return
        started = true
        // Loading reads/writes its own weather/loading state; keep those out of the
        // effect's dependency set so a progress update cannot tear down the request.
        void untrack(() => loadWeather())

        const timer = setInterval(refreshIfStale, REFRESH_INTERVAL)
        const onVisible = () => refreshIfStale()
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
            stopRequest()
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
                        <!-- AQI Compact -->
                        <div class="flex items-center gap-1.5">
                            <div class="h-2 w-2 rounded-full" style:background-color={weather.aqiColor}></div>
                            <span class="text-xs font-bold" style:color={weather.aqiColor}> AQI {weather.aqi} </span>
                        </div>

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
                <div class="flex w-16 shrink-0 flex-col items-center gap-1.5">
                    <span
                        class="text-[9px] font-black uppercase leading-none tracking-wide"
                        style:color={weather.aqiColor}
                    >
                        AQI {weather.aqi}
                    </span>
                    <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                            class="h-full rounded-full transition-all duration-300"
                            style:background-color={weather.aqiColor}
                            style:width="{Math.min((weather.aqi / 200) * 100, 100)}%"
                        ></div>
                    </div>
                    <span class="text-[8px] font-bold uppercase tracking-wide" style:color={weather.aqiColor}>
                        {weather.aqiCategory}
                    </span>
                </div>

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
        {/if}
    </div>
{/if}
