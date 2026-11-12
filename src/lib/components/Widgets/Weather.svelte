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
    const CARD_SURFACE =
        'rounded-2xl border border-line/60 bg-surface/85 px-3.5 py-3 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl'
    const CARD_WIDTH = 'md:w-[var(--q-weather-width)]'

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
