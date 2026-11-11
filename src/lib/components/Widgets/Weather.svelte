<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { hasPermission, isExtensionContext } from '$lib/utils/browser'
    import { buildWeather, type Weather } from '$lib/utils/weather'
    import { fly } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'

    let weather = $state<Weather | null>(null)
    let loading = $state(false)
    let error = $state<string | null>(null)
    let started = false

    const CACHE_KEY = 'weather:status:v2'
    const CACHE_TTL = 15 * 60 * 1000

    const readCache = (): Weather | null => {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY)
            if (!raw) return null
            const { ts, data } = JSON.parse(raw)
            return Date.now() - ts < CACHE_TTL ? data : null
        } catch {
            return null
        }
    }

    const writeCache = (data: Weather) => {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
        } catch {
            /* storage unavailable (private mode / quota) */
        }
    }

    const fetchWeatherData = async (lat: number, lon: number) => {
        try {
            const [gRes, wRes, aRes] = await Promise.all([
                // api.bigdatacloud.net 307-redirects here; calling the canonical host avoids the extra hop
                fetch(
                    `https://api-bdc.io/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
                ),
                fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
                ),
                fetch(
                    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`
                ),
            ])

            if (!gRes.ok || !wRes.ok || !aRes.ok) {
                throw new Error('API request failed')
            }

            const gData = await gRes.json()
            const wData = await wRes.json()
            const aData = await aRes.json()

            const current = wData.current
            if (!current) {
                throw new Error('No weather data available')
            }

            const result = buildWeather({
                temperature: current.temperature_2m,
                humidity: current.relative_humidity_2m ?? 0,
                weatherCode: current.weather_code,
                aqi: aData.current?.us_aqi ?? 0,
                location: gData.city || gData.locality || gData.countryName || 'Unknown',
                lat,
                lon,
            })

            writeCache(result)
            weather = result
            error = null
        } catch (e) {
            console.error('Weather fetch error:', e)
            error = 'Service Unavailable'
        } finally {
            loading = false
        }
    }

    const init = async () => {
        if (weather || loading) return

        const cached = readCache()
        if (cached) {
            weather = cached
            return
        }

        loading = true
        error = null

        if (!navigator.geolocation) {
            error = 'Geolocation not supported'
            loading = false
            return
        }

        if (isExtensionContext() && !(await hasPermission('geolocation'))) {
            error = 'Location Access Denied'
            loading = false
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                void fetchWeatherData(pos.coords.latitude, pos.coords.longitude)
            },
            (err) => {
                console.error('Geolocation error:', err)
                error = 'Location Access Denied'
                loading = false
            },
            { timeout: 10000, maximumAge: 60000 }
        )
    }

    export function refresh() {
        error = null
        loading = false
        started = true
        void init()
    }

    // Single reactive entry point: fetch only while the widget is enabled.
    $effect(() => {
        if (!appState.showWeather) {
            started = false
            return
        }
        if (started) return
        started = true
        void init()
    })
</script>

{#if appState.showWeather}
    <div
        class="fixed bottom-28 left-4 right-4 z-[45] md:bottom-auto md:top-6 md:right-24 md:left-auto"
        data-testid="weather-widget"
        in:fly={{ y: -16, duration: 300, easing: cubicOut }}
        out:fly={{ y: -16, duration: 300, easing: cubicOut }}
    >
        {#if loading}
            <div
                class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 shadow-xl md:w-[420px]"
            >
                <div class="h-3 w-3 animate-spin rounded-full border-2 border-fg-subtle border-t-transparent"></div>
                <span class="text-[11px] font-medium text-fg-muted">Locating weather…</span>
            </div>
        {:else if error}
            <div
                class="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-xl md:w-[420px]"
            >
                <span class="text-[11px] font-medium text-fg-muted">{error}</span>
                <button
                    onclick={refresh}
                    class="text-[11px] font-medium text-accent-text hover:underline"
                    aria-label="Retry weather">Retry</button
                >
            </div>
        {:else if weather}
            <!-- Mobile Layout (< md) -->
            <div class="w-full rounded-xl border border-line bg-surface px-4 py-3 shadow-xl md:hidden">
                <!-- Top Row: Location & Temp -->
                <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="max-w-40 truncate text-[10px] font-semibold uppercase tracking-wide text-fg">
                            {weather.location}
                        </span>
                        <span
                            class="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide {weather.vibe ===
                            'Warm'
                                ? 'bg-warning-soft text-warning'
                                : 'bg-accent-soft text-accent-text'}"
                        >
                            {weather.vibe}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-2xl leading-none">{weather.icon}</span>
                        <span class="text-2xl font-semibold leading-none tabular-nums text-fg">{weather.temp}°</span>
                    </div>
                </div>

                <!-- Bottom Row: Condition, AQI, Humidity -->
                <div class="flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span class="text-[11px] font-medium capitalize text-fg-muted">{weather.condition}</span>

                    <div class="flex items-center gap-3">
                        <!-- AQI Compact -->
                        <div class="flex items-center gap-1.5">
                            <div class="h-2 w-2 rounded-full" style:background-color={weather.aqiColor}></div>
                            <span class="text-[11px] font-semibold" style:color={weather.aqiColor}>
                                AQI {weather.aqi}
                            </span>
                        </div>

                        <!-- Humidity -->
                        <div class="flex items-center gap-1.5">
                            <svg class="h-3 w-3 text-accent-text" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z" />
                            </svg>
                            <span class="text-[11px] font-semibold tabular-nums text-fg">{weather.humidity}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Desktop Layout (≥ md) -->
            <div
                class="hidden w-[420px] items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-xl md:flex"
            >
                <!-- Location & Vibe -->
                <div class="flex shrink-0 items-center gap-2.5 border-r border-line pr-3">
                    <span
                        class="max-w-40 truncate whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-fg"
                    >
                        {weather.location}
                    </span>
                    <span
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide {weather.vibe ===
                        'Warm'
                            ? 'bg-warning-soft text-warning'
                            : 'bg-accent-soft text-accent-text'}"
                    >
                        {weather.vibe}
                    </span>
                </div>

                <!-- Temperature -->
                <div class="flex shrink-0 items-center gap-2.5">
                    <span class="text-xl leading-none">{weather.icon}</span>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-2xl font-semibold leading-none tabular-nums text-fg">{weather.temp}°</span>
                        <span class="text-[10px] font-medium uppercase leading-none tracking-wide text-fg-muted"
                            >{weather.condition}</span
                        >
                    </div>
                </div>

                <!-- AQI -->
                <div class="flex min-w-16 shrink-0 flex-col items-center gap-1.5">
                    <span
                        class="text-[10px] font-semibold uppercase leading-none tracking-wide"
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
                    <span class="text-[9px] font-semibold uppercase tracking-wide" style:color={weather.aqiColor}>
                        {weather.aqiCategory}
                    </span>
                </div>

                <!-- Humidity -->
                <div class="flex shrink-0 items-center gap-2 border-l border-line pl-3">
                    <svg class="h-3.5 w-3.5 text-accent-text" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z" />
                    </svg>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-sm font-semibold leading-none tabular-nums text-fg">{weather.humidity}%</span>
                        <span class="text-[10px] font-medium uppercase leading-none tracking-wide text-fg-muted"
                            >Humidity</span
                        >
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}
