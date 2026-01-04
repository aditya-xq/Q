<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { onMount } from 'svelte'

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

    let weather: Weather | null = null
    let loading = false
    let error: string | null = null

    const CACHE_KEY = 'weather:status:v2'
    const CACHE_TTL = 15 * 60 * 1000

    const readCache = (): Weather | null => {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY)
            if (!raw) return null
            const { ts, data } = JSON.parse(raw)
            return Date.now() - ts < CACHE_TTL ? data : null
        } catch { return null }
    }

    const writeCache = (data: Weather) => {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
        } catch {}
    }

    const weatherMap: Record<number, string> = {
        0: 'Clear', 1: 'Fair', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 61: 'Rain', 71: 'Snow',
        80: 'Rain Showers', 95: 'Stormy'
    }

    const getWeatherIcon = (code: number) => {
        if (code === 0) return '☀️'
        if (code <= 3) return '⛅'
        if (code >= 95) return '⛈️'
        if (code >= 71) return '❄️'
        if (code >= 51) return '🌧️'
        if (code >= 45) return '🌫️'
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
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`),
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto`)
            ])

            const gData = await gRes.json()
            const wData = await wRes.json()
            const aData = await aRes.json()

            const current = wData.current_weather
            const hourIndex = wData.hourly.time.indexOf(current.time) ?? 0
            const aqiValue = aData.hourly.us_aqi[hourIndex]
            const { label, color } = getAqiMeta(aqiValue)

            const result: Weather = {
                temp: Math.round(current.temperature),
                condition: weatherMap[current.weathercode] ?? 'Cloudy',
                icon: getWeatherIcon(current.weathercode),
                location: gData.city || gData.locality || 'Unknown',
                humidity: Math.round(wData.hourly.relativehumidity_2m[hourIndex] ?? 0),
                aqi: Math.round(aqiValue ?? 0),
                aqiCategory: label,
                aqiColor: color,
                vibe: current.temperature > 25 ? 'Warm' : 'Cool'
            }

            writeCache(result)
            weather = result
        } catch (e) {
            error = 'Service Unavailable'
        }
    }

    const init = async () => {
        const cached = readCache()
        if (cached) { weather = cached; return }

        loading = true
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await fetchWeatherData(pos.coords.latitude, pos.coords.longitude)
                loading = false
            },
            () => { error = 'Location Access Denied'; loading = false }
        )
    }

    onMount(init)
</script>

{#if appState.widgets.showWeather}
    <div class="fixed top-6 right-22 z-40">
        {#if loading}
            <div class="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locating...</span>
            </div>

        {:else if error}
            <div class="text-[10px] font-bold text-red-500 bg-red-50/80 dark:bg-red-950/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-200/50 shadow-sm">
                ⚠️ {error}
            </div>

        {:else if weather}
            <div class="flex items-center gap-4 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl px-4 py-2 rounded-lg border border-white/40 dark:border-slate-600/60 transition-all">
                
                <div class="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                    <span class="text-[12px] font-black text-slate-800 dark:text-slate-300 uppercase">
                        {weather.location}
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase {weather.vibe === 'Warm' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}">
                        {weather.vibe}
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-base leading-none">{weather.icon}</span>
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-slate-900 dark:text-slate-200 leading-none tabular-nums">{weather.temp}°</span>
                        <span class="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">{weather.condition}</span>
                    </div>
                </div>

                <div class="flex flex-col items-center min-w-15">
                    <span class="text-[8px] font-black uppercase leading-none mb-1" style:color={weather.aqiColor}>AQI {weather.aqi}</span>
                    <div class="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" style:background-color={weather.aqiColor} style:width="{Math.min((weather.aqi / 200) * 100, 100)}%"></div>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                    <svg class="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-3.582-8-8s8-11 8-11 8 6.582 8 11-3.582 8-8 8z"/></svg>
                    <span class="text-sm font-black text-slate-900 dark:text-slate-200 leading-none tabular-nums">{weather.humidity}%</span>
                </div>

            </div>
        {/if}
    </div>
{/if}
