export interface Weather {
    temp: number
    condition: string
    location: string
    icon: string
    humidity: number
    aqi: number
    vibe: string
    aqiCategory: string
    aqiColor: string
    lat: number
    lon: number
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
    aqi: number
    location: string
    lat: number
    lon: number
}

export function buildWeather(input: WeatherInput): Weather {
    const { label, color } = getAqiMeta(input.aqi)
    return {
        temp: Math.round(input.temperature),
        condition: WEATHER_CODES[input.weatherCode] ?? 'Cloudy',
        icon: getWeatherIcon(input.weatherCode),
        location: input.location || 'Unknown',
        humidity: Math.round(input.humidity),
        aqi: Math.round(input.aqi),
        aqiCategory: label,
        aqiColor: color,
        vibe: input.temperature > 25 ? 'Warm' : 'Cool',
        lat: input.lat,
        lon: input.lon,
    }
}
