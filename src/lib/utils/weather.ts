export interface Weather {
    temp: number
    condition: string
    location: string
    icon: string
    humidity: number
    /** `null` when the air-quality feed returned no usable reading. */
    aqi: WeatherAqi | null
    vibe: string
    lat: number
    lon: number
}

export interface WeatherAqi {
    value: number
    /** AQI scaled to a 0-100 bar width, precomputed so the template stays a pure read. */
    percent: number
    category: string
    color: string
}

/** A reverse-geocoded place name, cached per rounded coordinate pair. */
export interface WeatherLocation {
    name: string
    lat: number
    lon: number
}

export interface WeatherReading {
    temperature: number
    humidity: number
    weatherCode: number
}

export const WEATHER_CODES: Record<number, string> = {
    0: 'Clear',
    1: 'Fair',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Drizzle',
    53: 'Drizzle',
    55: 'Drizzle',
    61: 'Rain',
    63: 'Rain',
    65: 'Rain',
    71: 'Snow',
    73: 'Snow',
    75: 'Snow',
    80: 'Rain Showers',
    81: 'Rain Showers',
    82: 'Rain Showers',
    95: 'Stormy',
    96: 'Stormy',
    99: 'Stormy',
}

export function getWeatherIcon(code: number): string {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code >= 95) return '⛈️'
    if (code >= 71 && code <= 75) return '❄️'
    if (code >= 51 && code <= 65) return '🌧️'
    if (code >= 80 && code <= 82) return '🌧️'
    if (code >= 45 && code <= 48) return '🌫️'
    return '☁️'
}

export function getAqiMeta(aqi: number): { label: string; color: string } {
    if (aqi <= 50) return { label: 'Good', color: '#10b981' }
    if (aqi <= 100) return { label: 'Moderate', color: '#f59e0b' }
    if (aqi <= 150) return { label: 'Sensitive', color: '#f97316' }
    return { label: 'Poor', color: '#ef4444' }
}

export interface WeatherInput {
    temperature: number
    humidity: number
    weatherCode: number
    aqi: number | null
    location: string
    lat: number
    lon: number
}

function buildAqi(aqi: number): WeatherAqi {
    const value = Math.round(aqi)
    const { label, color } = getAqiMeta(value)
    return {
        value,
        percent: Math.min(Math.round((value / 200) * 100), 100),
        category: label,
        color,
    }
}

export function buildWeather(input: WeatherInput): Weather {
    return {
        temp: Math.round(input.temperature),
        condition: WEATHER_CODES[input.weatherCode] ?? 'Cloudy',
        icon: getWeatherIcon(input.weatherCode),
        location: input.location || 'Unknown',
        humidity: Math.round(input.humidity),
        aqi: input.aqi === null ? null : buildAqi(input.aqi),
        vibe: input.temperature > 25 ? 'Warm' : 'Cool',
        lat: input.lat,
        lon: input.lon,
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function readFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Accepts a cached `Weather` row, rejecting shapes that would render as `undefined`/`NaN`. */
export function isCachedWeather(value: unknown): value is Weather {
    if (!isRecord(value)) return false
    return (
        readFiniteNumber(value.temp) !== null &&
        readFiniteNumber(value.humidity) !== null &&
        readFiniteNumber(value.lat) !== null &&
        readFiniteNumber(value.lon) !== null &&
        (value.aqi === null || isCachedWeatherAqi(value.aqi)) &&
        typeof value.location === 'string' &&
        typeof value.condition === 'string' &&
        typeof value.icon === 'string' &&
        typeof value.vibe === 'string'
    )
}

function isCachedWeatherAqi(value: unknown): value is WeatherAqi {
    if (!isRecord(value)) return false
    return (
        readFiniteNumber(value.value) !== null &&
        readFiniteNumber(value.percent) !== null &&
        typeof value.category === 'string' &&
        typeof value.color === 'string'
    )
}

export function isCachedWeatherLocation(value: unknown): value is WeatherLocation {
    if (!isRecord(value)) return false
    return (
        typeof value.name === 'string' &&
        value.name.trim().length > 0 &&
        readFiniteNumber(value.lat) !== null &&
        readFiniteNumber(value.lon) !== null
    )
}

/** Whether a cached place name still describes these coordinates (~5 km at the default tolerance). */
export function matchesWeatherLocation(location: WeatherLocation, lat: number, lon: number, tolerance = 0.05) {
    return Math.abs(location.lat - lat) <= tolerance && Math.abs(location.lon - lon) <= tolerance
}

/** Extracts the numeric reading from an Open-Meteo forecast payload, or null when unusable. */
export function parseWeatherReading(payload: unknown): WeatherReading | null {
    if (!isRecord(payload) || !isRecord(payload.current)) return null
    const temperature = readFiniteNumber(payload.current.temperature_2m)
    const weatherCode = readFiniteNumber(payload.current.weather_code)
    if (temperature === null || weatherCode === null) return null
    return {
        temperature,
        humidity: readFiniteNumber(payload.current.relative_humidity_2m) ?? 0,
        weatherCode,
    }
}

/** Extracts the US AQI from an Open-Meteo air-quality payload, or null when it has no reading. */
export function parseAqi(payload: unknown): number | null {
    if (!isRecord(payload) || !isRecord(payload.current)) return null
    return readFiniteNumber(payload.current.us_aqi)
}

/** Extracts the most specific place name from a reverse-geocode payload. */
export function parseLocationName(payload: unknown): string | null {
    if (!isRecord(payload)) return null
    for (const key of ['city', 'locality', 'countryName'] as const) {
        const value = payload[key]
        if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return null
}
