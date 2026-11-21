import { describe, expect, test } from 'bun:test'
import {
    WEATHER_CODES,
    buildWeather,
    getAqiMeta,
    getWeatherIcon,
    isCachedWeather,
    isCachedWeatherLocation,
    matchesWeatherLocation,
    parseAqi,
    parseLocationName,
    parseWeatherReading,
} from '$lib/utils/weather'

describe('getWeatherIcon', () => {
    test('maps representative WMO codes to emoji', () => {
        expect(getWeatherIcon(0)).toBe('☀️')
        expect(getWeatherIcon(1)).toBe('⛅')
        expect(getWeatherIcon(3)).toBe('⛅')
        expect(getWeatherIcon(45)).toBe('🌫️')
        expect(getWeatherIcon(48)).toBe('🌫️')
        expect(getWeatherIcon(51)).toBe('🌧️')
        expect(getWeatherIcon(65)).toBe('🌧️')
        expect(getWeatherIcon(71)).toBe('❄️')
        expect(getWeatherIcon(75)).toBe('❄️')
        expect(getWeatherIcon(80)).toBe('🌧️')
        expect(getWeatherIcon(82)).toBe('🌧️')
        expect(getWeatherIcon(95)).toBe('⛈️')
        expect(getWeatherIcon(99)).toBe('⛈️')
    })

    test('defaults to a cloud for unmapped codes', () => {
        expect(getWeatherIcon(4)).toBe('☁️')
        expect(getWeatherIcon(50)).toBe('☁️')
    })
})

describe('getAqiMeta', () => {
    test('categorizes at the documented boundaries', () => {
        expect(getAqiMeta(0).label).toBe('Good')
        expect(getAqiMeta(50).label).toBe('Good')
        expect(getAqiMeta(51).label).toBe('Moderate')
        expect(getAqiMeta(100).label).toBe('Moderate')
        expect(getAqiMeta(101).label).toBe('Sensitive')
        expect(getAqiMeta(150).label).toBe('Sensitive')
        expect(getAqiMeta(151).label).toBe('Poor')
    })
})

describe('buildWeather', () => {
    test('rounds values and derives condition, icon and vibe', () => {
        const weather = buildWeather({
            temperature: 25.6,
            humidity: 61.4,
            weatherCode: 3,
            aqi: 42.7,
            location: 'Berlin',
            lat: 52.5,
            lon: 13.4,
        })

        expect(weather.temp).toBe(26)
        expect(weather.humidity).toBe(61)
        expect(weather.aqi?.value).toBe(43)
        expect(weather.condition).toBe('Overcast')
        expect(weather.icon).toBe('⛅')
        expect(weather.vibe).toBe('Warm')
        expect(weather.aqi?.category).toBe('Good')
        expect(weather.lat).toBe(52.5)
        expect(weather.lon).toBe(13.4)
    })

    test('treats a missing air-quality reading as unknown instead of "Good"', () => {
        const weather = buildWeather({
            temperature: 20,
            humidity: 40,
            weatherCode: 0,
            aqi: null,
            location: 'Berlin',
            lat: 52.5,
            lon: 13.4,
        })
        expect(weather.aqi).toBeNull()
        expect(weather.temp).toBe(20)
    })

    test('uses Cool for temperatures at or below 25', () => {
        const weather = buildWeather({
            temperature: 25,
            humidity: 40,
            weatherCode: 0,
            aqi: 10,
            location: 'Oslo',
            lat: 60,
            lon: 10,
        })
        expect(weather.vibe).toBe('Cool')
    })

    test('defaults the condition for unknown codes and location when blank', () => {
        const weather = buildWeather({
            temperature: 10,
            humidity: 50,
            weatherCode: 123,
            aqi: 10,
            location: '',
            lat: 0,
            lon: 0,
        })
        expect(weather.condition).toBe('Cloudy')
        expect(weather.location).toBe('Unknown')
    })

    test('has a human-readable condition for every mapped code', () => {
        for (const [code, condition] of Object.entries(WEATHER_CODES)) {
            expect(Number.isNaN(Number(code))).toBe(false)
            expect(condition.length).toBeGreaterThan(0)
        }
    })

    test('precomputes the AQI bar width from the rounded value, capped at 100', () => {
        const make = (aqi: number) =>
            buildWeather({ temperature: 20, humidity: 40, weatherCode: 0, aqi, location: 'X', lat: 0, lon: 0 })
        expect(make(0).aqi?.percent).toBe(0)
        expect(make(50).aqi?.percent).toBe(25)
        expect(make(200).aqi?.percent).toBe(100)
        expect(make(500).aqi?.percent).toBe(100)
        // Category is derived from the rounded AQI, so 50.6 rounds to 51 -> Moderate.
        expect(make(50.6).aqi?.category).toBe('Moderate')
        expect(make(50.6).aqi?.percent).toBe(26)
    })
})

describe('parseWeatherReading', () => {
    test('maps a well-formed Open-Meteo payload', () => {
        expect(
            parseWeatherReading({
                current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 },
            })
        ).toEqual({ temperature: 27.6, humidity: 55.4, weatherCode: 3 })
    })

    test('defaults missing humidity and rejects unusable payloads', () => {
        expect(parseWeatherReading({ current: { temperature_2m: 10, weather_code: 1 } })?.humidity).toBe(0)
        expect(parseWeatherReading({ current: { weather_code: 1 } })).toBeNull()
        expect(parseWeatherReading({ current: { temperature_2m: 'hot', weather_code: 1 } })).toBeNull()
        expect(parseWeatherReading({ current: null })).toBeNull()
        expect(parseWeatherReading(null)).toBeNull()
    })
})

describe('parseAqi', () => {
    test('reads us_aqi and reports missing readings as null', () => {
        expect(parseAqi({ current: { us_aqi: 42.7 } })).toBe(42.7)
        expect(parseAqi({ current: {} })).toBeNull()
        expect(parseAqi({})).toBeNull()
        expect(parseAqi(undefined)).toBeNull()
    })
})

describe('parseLocationName', () => {
    test('prefers city, then locality, then country', () => {
        expect(parseLocationName({ city: 'Berlin', locality: 'Mitte', countryName: 'Germany' })).toBe('Berlin')
        expect(parseLocationName({ city: '', locality: 'Mitte', countryName: 'Germany' })).toBe('Mitte')
        expect(parseLocationName({ countryName: 'Germany' })).toBe('Germany')
        expect(parseLocationName({ city: '  ' })).toBeNull()
        expect(parseLocationName(null)).toBeNull()
    })
})

describe('cached weather guards', () => {
    const weather = buildWeather({
        temperature: 20,
        humidity: 40,
        weatherCode: 0,
        aqi: 40,
        location: 'Berlin',
        lat: 52.5,
        lon: 13.4,
    })

    test('accepts a complete cached row, including one without an AQI reading', () => {
        expect(isCachedWeather(weather)).toBe(true)
        expect(isCachedWeather({ ...weather, aqi: null })).toBe(true)
    })

    test('rejects rows from older cache shapes that would render blank fields', () => {
        expect(isCachedWeather({ temp: 20, location: 'Berlin', condition: 'Clear' })).toBe(false)
        expect(isCachedWeather({ ...weather, aqi: 43 })).toBe(false)
        expect(isCachedWeather({ ...weather, aqi: { value: 43 } })).toBe(false)
        expect(isCachedWeather({ ...weather, temp: Number.NaN })).toBe(false)
        expect(isCachedWeather('weather')).toBe(false)
    })

    test('matches a cached place name to nearby coordinates only', () => {
        const location = { name: 'Berlin', lat: 52.5, lon: 13.4 }
        expect(isCachedWeatherLocation(location)).toBe(true)
        expect(isCachedWeatherLocation({ name: '', lat: 1, lon: 1 })).toBe(false)
        expect(isCachedWeatherLocation({ name: 'Berlin', lat: 'x', lon: 1 })).toBe(false)
        expect(matchesWeatherLocation(location, 52.51, 13.41)).toBe(true)
        expect(matchesWeatherLocation(location, 52.6, 13.4)).toBe(false)
    })
})
