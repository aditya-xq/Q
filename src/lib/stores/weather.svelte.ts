import { hasPermission, isExtensionContext } from '$lib/utils/browser'
import { isSessionCacheFresh, readSessionCache, writeSessionCache } from '$lib/utils/sessionCache'
import {
    buildWeather,
    isCachedWeather,
    isCachedWeatherLocation,
    matchesWeatherLocation,
    parseAqi,
    parseLocationName,
    parseWeatherReading,
    type Weather,
    type WeatherReading,
} from '$lib/utils/weather'

const CACHE_KEY = 'weather:status:v5'
const LOCATION_KEY = 'weather:location:v1'
const CACHE_TTL = 15 * 60 * 1000
/** Place names barely move, so a resolved coordinate pair is reused for a whole day. */
const LOCATION_TTL = 24 * 60 * 60 * 1000
/** A fix older than this is worth asking the geolocation API for again. */
const LOCATION_MAX_AGE = 60 * 60 * 1000
/** Backs off after a failure so tab flips cannot hammer a downed service. */
const FAILURE_BACKOFF = 60 * 1000
const GEO_TIMEOUT_MS = 10 * 1000

export const WEATHER_REFRESH_INTERVAL = CACHE_TTL

const FORECAST_URL = (lat: number, lon: number) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
const AIR_QUALITY_URL = (lat: number, lon: number) =>
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`
// api.bigdatacloud.net 307-redirects here; calling the canonical host avoids the extra hop
const GEOCODE_URL = (lat: number, lon: number) =>
    `https://api-bdc.io/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`

export interface WeatherState {
    data: Weather | null
    loading: boolean
    error: string | null
    /** Epoch ms of the last successful fetch (or cache write). */
    fetchedAt: number
    /** Epoch ms of the last failed fetch. */
    failedAt: number
}

export const weatherState = $state<WeatherState>({
    data: null,
    loading: false,
    error: null,
    fetchedAt: 0,
    failedAt: 0,
})

let requestId = 0
/** Plain flag: `loading` is presentation state (false while stale data is shown). */
let inFlight = false
let controller: AbortController | null = null
let coords: { lat: number; lon: number; at: number } | null = null

/**
 * Module-level cache hydration: the widget is only ever rendered after settings load
 * client-side, so reading sessionStorage here cannot cause a hydration mismatch.
 */
function hydrate() {
    const cached = readSessionCache(CACHE_KEY, isCachedWeather)
    if (!cached) return
    if (!weatherState.data || cached.ts > weatherState.fetchedAt) {
        weatherState.data = cached.data
        weatherState.fetchedAt = cached.ts
    }
    coords ??= { lat: cached.data.lat, lon: cached.data.lon, at: cached.ts }
}

/** Fresh covers both the session cache and a reading that was never cached (unresolved place name). */
function hasFreshData(): boolean {
    return weatherState.data !== null && Date.now() - weatherState.fetchedAt < CACHE_TTL
}

function readLocationName(lat: number, lon: number): string | null {
    const cached = readSessionCache(LOCATION_KEY, isCachedWeatherLocation)
    if (!cached || !isSessionCacheFresh(cached, LOCATION_TTL)) return null
    return matchesWeatherLocation(cached.data, lat, lon) ? cached.data.name : null
}

/** Resolves a place name, reusing the session cache instead of hitting the geocoder again. */
async function resolveLocationName(lat: number, lon: number, signal: AbortSignal): Promise<string | null> {
    const known = readLocationName(lat, lon)
    if (known) return known
    try {
        const response = await fetch(GEOCODE_URL(lat, lon), { signal })
        if (!response.ok) return null
        const name = parseLocationName(await response.json())
        if (!name) return null
        writeSessionCache(LOCATION_KEY, { name, lat, lon })
        return name
    } catch {
        return null
    }
}

interface WeatherReadingResult {
    reading: WeatherReading
    aqi: number | null
}

/** Forecast is required; air quality is optional so a single degraded feed cannot blank the card. */
async function requestWeather(lat: number, lon: number, signal: AbortSignal): Promise<WeatherReadingResult> {
    const aqiPromise = fetch(AIR_QUALITY_URL(lat, lon), { signal }).then(
        (response) => (response.ok ? response.json().catch(() => null) : null),
        () => null
    )
    const forecastResponse = await fetch(FORECAST_URL(lat, lon), { signal })
    if (!forecastResponse.ok) throw new Error('API request failed')
    const reading = parseWeatherReading(await forecastResponse.json())
    if (!reading) throw new Error('No weather data available')
    return { reading, aqi: parseAqi(await aqiPromise) }
}

/**
 * Publishes a reading. A reading whose place name is still unresolved is kept in memory
 * only, so a degraded "Unknown" label never survives into the next session.
 */
function publish(weather: Weather, cache = true) {
    weatherState.data = weather
    weatherState.fetchedAt = cache ? writeSessionCache(CACHE_KEY, weather) : Date.now()
    weatherState.failedAt = 0
    weatherState.error = null
}

function finish(id: number) {
    if (id !== requestId) return
    inFlight = false
    weatherState.loading = false
}

async function loadAt(lat: number, lon: number, id: number, signal: AbortSignal) {
    // Start the geocoder immediately but off the critical path: the reading paints
    // first, then the place name is patched in when (or if) it arrives.
    const locationPromise = resolveLocationName(lat, lon, signal)
    try {
        const { reading, aqi } = await requestWeather(lat, lon, signal)
        if (id !== requestId) return

        const name = readLocationName(lat, lon)
        publish(
            buildWeather({
                temperature: reading.temperature,
                humidity: reading.humidity,
                weatherCode: reading.weatherCode,
                aqi,
                location: name ?? '',
                lat,
                lon,
            }),
            name !== null
        )

        void locationPromise.then((resolved) => {
            const current = weatherState.data
            if (!resolved || id !== requestId || !current || current.location === resolved) return
            publish({ ...current, location: resolved })
        })
    } catch (e) {
        if (signal.aborted || id !== requestId) return
        console.error('Weather fetch error:', e)
        weatherState.failedAt = Date.now()
        weatherState.error = 'Service Unavailable'
    } finally {
        finish(id)
    }
}

/**
 * Loads (or refreshes) the widget, reusing the session cache, the last coordinates
 * and the cached place name whenever possible. `recenter` forces a fresh fix.
 */
export async function ensureWeatherLoaded(force = false, recenter = false) {
    if (inFlight && !force) return

    weatherState.error = null
    hydrate()
    if (!force && hasFreshData()) return

    weatherState.loading = !weatherState.data

    const id = ++requestId
    inFlight = true
    controller?.abort()
    const requestController = new AbortController()
    controller = requestController

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        weatherState.error = 'Geolocation not supported'
        finish(id)
        return
    }

    if (isExtensionContext()) {
        try {
            if (!(await hasPermission('geolocation'))) {
                if (id !== requestId) return
                weatherState.error = 'Location Access Denied'
                finish(id)
                return
            }
        } catch (permissionError) {
            console.error('Weather permission check failed:', permissionError)
            if (id !== requestId) return
            weatherState.error = 'Location Access Denied'
            finish(id)
            return
        }
        if (id !== requestId) return
    }

    if (!recenter && coords && Date.now() - coords.at < LOCATION_MAX_AGE) {
        void loadAt(coords.lat, coords.lon, id, requestController.signal)
        return
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            if (id !== requestId) return
            coords = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                at: Date.now(),
            }
            void loadAt(coords.lat, coords.lon, id, requestController.signal)
        },
        (geoError) => {
            if (id !== requestId) return
            console.error('Geolocation error:', geoError)
            weatherState.failedAt = Date.now()
            weatherState.error = 'Location Access Denied'
            finish(id)
        },
        { timeout: GEO_TIMEOUT_MS, maximumAge: 5 * 60 * 1000 }
    )
}

/** Refreshes only when the tab is visible, the data is stale and no retry is backing off. */
export function refreshWeatherIfStale() {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (inFlight) return
    if (hasFreshData()) return
    if (weatherState.failedAt && Date.now() - weatherState.failedAt < FAILURE_BACKOFF) return
    void ensureWeatherLoaded(true)
}

/** Cancels in-flight work, e.g. when the widget is turned off. */
export function stopWeather() {
    requestId += 1
    inFlight = false
    controller?.abort()
    controller = null
    weatherState.loading = false
}

hydrate()
