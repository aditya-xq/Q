<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { fly } from 'svelte/transition'
    import { quintOut } from 'svelte/easing'

    interface Weather {
        temp: number
        condition: string
        location: string
        icon: string
        humidity: number
        aqi: number
        vibe: string
        aqiCategory: string
        aqiColor: string
    }

    let weather = $state<Weather | null>(null)
    let loading = $state(false)
    let error = $state<string | null>(null)

    const CACHE_KEY = 'weather:status:v1'
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
        } catch {}
    }

    const weatherMap: Record<number, string> = {
        0: 'Clear', 1: 'Fair', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
        61: 'Rain', 63: 'Rain', 65: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow',
        80: 'Rain Showers', 81: 'Rain Showers', 82: 'Rain Showers',
        95: 'Stormy', 96: 'Stormy', 99: 'Stormy'
    }

    const getWeatherIcon = (code: number): string => {
        if (code === 0) return '☀️'
        if (code <= 3) return '⛅'
        if (code >= 95) return '⛈️'
        if (code >= 71 && code <= 75) return '❄️'
        if (code >= 51 && code <= 65) return '🌧️'
        if (code >= 80 && code <= 82) return '🌧️'
        if (code >= 45 && code <= 48) return '🌫️'
        return '☁️'
    }

    const getAqiMeta = (aqi: number) => {
        if (aqi <= 50) return { label: 'Good', color: '#10b981' }
        if (aqi <= 100) return { label: 'Moderate', color: '#f59e0b' }
        if (aqi <= 150) return { label: 'Sensitive', color: '#f97316' }
        return { label: 'Poor', color: '#ef4444' }
    }

    const fetchWeatherData = async (lat: number, lon: number) => {
        try {
            const [gRes, wRes, aRes] = await Promise.all([
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`),
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`),
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`)
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

            const humidity = current.relative_humidity_2m ?? 0
            const aqiValue = aData.current?.us_aqi ?? 0
            const { label, color } = getAqiMeta(aqiValue)

            const result: Weather = {
                temp: Math.round(current.temperature_2m),
                condition: weatherMap[current.weather_code] ?? 'Cloudy',
                icon: getWeatherIcon(current.weather_code),
                location: gData.city || gData.locality || gData.countryName || 'Unknown',
                humidity: Math.round(humidity),
                aqi: Math.round(aqiValue),
                aqiCategory: label,
                aqiColor: color,
                vibe: current.temperature_2m > 25 ? 'Warm' : 'Cool'
            }

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
        if (!appState.showWeather) return

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

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await fetchWeatherData(pos.coords.latitude, pos.coords.longitude)
            },
            (err) => { 
                console.error('Geolocation error:', err)
                error = 'Location Access Denied'
                loading = false
            },
            { timeout: 10000, maximumAge: 60000 }
        )
    }

    // Initialize on mount
    $effect(() => {
        init()
    })

    // Re-initialize when widget visibility changes
    $effect(() => {
        if (appState.showWeather && !weather && !loading && !error) {
            init()
        }
    })
</script>

{#if appState.showWeather}
    <div 
        class="fixed top-6 right-24 z-40"
        in:fly="{{ y: -20, duration: 500, easing: quintOut }}"
        out:fly="{{ y: -20, duration: 300, easing: quintOut }}">
        {#if loading}
            <div class="flex items-center gap-3 px-5 py-2.5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
                <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Locating...</span>
            </div>

        {:else if error}
            <div class="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/40 backdrop-blur-lg px-4 py-2 rounded-full border border-red-200/60 dark:border-red-800/60 shadow-lg">
                ⚠️ {error}
            </div>

        {:else if weather}
            <div class="flex items-center gap-4 bg-white/85 dark:bg-slate-950/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl transition-all hover:shadow-2xl">
                
                <!-- Location & Vibe -->
                <div class="flex items-center gap-2.5 border-r border-slate-300 dark:border-slate-700 pr-4">
                    <span class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                        {weather.location}
                    </span>
                    <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide {weather.vibe === 'Warm' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'}">
                        {weather.vibe}
                    </span>
                </div>

                <!-- Temperature -->
                <div class="flex items-center gap-2.5">
                    <span class="text-xl leading-none">{weather.icon}</span>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-lg font-black text-slate-900 dark:text-slate-100 leading-none tabular-nums">{weather.temp}°</span>
                        <span class="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">{weather.condition}</span>
                    </div>
                </div>

                <!-- AQI -->
                <div class="flex flex-col items-center min-w-16 gap-1.5">
                    <span class="text-[9px] font-black uppercase leading-none tracking-wide" style:color={weather.aqiColor}>
                        AQI {weather.aqi}
                    </span>
                    <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            class="h-full rounded-full transition-all duration-300" 
                            style:background-color={weather.aqiColor} 
                            style:width="{Math.min((weather.aqi / 200) * 100, 100)}%">
                        </div>
                    </div>
                    <span class="text-[8px] font-bold uppercase tracking-wide" style:color={weather.aqiColor}>
                        {weather.aqiCategory}
                    </span>
                </div>

                <!-- Humidity -->
                <div class="flex items-center gap-2 pl-4 border-l border-slate-300 dark:border-slate-700">
                    <svg class="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z"/>
                    </svg>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-sm font-black text-slate-900 dark:text-slate-100 leading-none tabular-nums">{weather.humidity}%</span>
                        <span class="text-[7px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">Humidity</span>
                    </div>
                </div>

            </div>
        {/if}
    </div>
{/if}
