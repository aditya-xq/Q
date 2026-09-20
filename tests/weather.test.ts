import { describe, expect, test } from 'bun:test'
import { WEATHER_CODES, buildWeather, getAqiMeta, getWeatherIcon } from '$lib/utils/weather'

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
        expect(weather.aqi).toBe(43)
        expect(weather.condition).toBe('Overcast')
        expect(weather.icon).toBe('⛅')
        expect(weather.vibe).toBe('Warm')
        expect(weather.aqiCategory).toBe('Good')
        expect(weather.lat).toBe(52.5)
        expect(weather.lon).toBe(13.4)
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
})
