import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 52.52, longitude: 13.405 },
})

const GEOCODE_URL = 'https://api-bdc.io/**'
const FORECAST_URL = 'https://api.open-meteo.com/**'
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/**'

async function enableWeather(page: import('@playwright/test').Page): Promise<void> {
    await openHome(page)
    await page.getByRole('button', { name: 'Settings (Alt + S)' }).click()
    await page.getByRole('button', { name: 'Toggle weather widget' }).click()
}

test.describe('Weather widget', () => {
    test('renders mocked conditions when enabled', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) =>
            route.fulfill({ json: { city: 'Testville', locality: 'Testville', countryName: 'Testland' } })
        )
        await page.route(FORECAST_URL, (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 } },
            })
        )
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ json: { current: { us_aqi: 42.7 } } }))

        await enableWeather(page)

        // Both responsive layouts are in the DOM; the desktop one is visible at the default viewport.
        await expect(page.getByText('Testville').last()).toBeVisible()
        await expect(page.getByText('28°').last()).toBeVisible()
        await expect(page.getByText('Overcast').last()).toBeVisible()
        await expect(page.getByText('Warm').last()).toBeVisible()
        await expect(page.getByText('AQI 43').last()).toBeVisible()
    })

    test('shows a card-shaped skeleton while loading', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) =>
            route.fulfill({ json: { city: 'Testville', locality: 'Testville', countryName: 'Testland' } })
        )
        await page.route(FORECAST_URL, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 800))
            return route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 } },
            })
        })
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ json: { current: { us_aqi: 42.7 } } }))

        await enableWeather(page)

        const skeleton = page.getByTestId('weather-loading')
        await expect(skeleton).toBeVisible()
        await expect(page.getByText('Loading weather…')).toHaveCount(1)
        await expect(skeleton).toHaveCSS('width', '440px')
        expect(await skeleton.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

        await expect(page.getByText('Testville').last()).toBeVisible()
        await expect(skeleton).toHaveCount(0)
    })

    test('still renders conditions when the air-quality feed is down', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) => route.fulfill({ json: { city: 'Testville' } }))
        await page.route(FORECAST_URL, (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 } },
            })
        )
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))

        await enableWeather(page)

        await expect(page.getByText('Testville').last()).toBeVisible()
        // Air quality is omitted rather than reported as a healthy "AQI 0".
        await expect(page.getByTestId('weather-aqi')).toHaveCount(0)
        await expect(page.getByTestId('weather-error')).toHaveCount(0)
    })

    test('retries a failed place name instead of caching "Unknown"', async ({ page }) => {
        let geocodeRequests = 0
        await page.route(GEOCODE_URL, (route) => {
            geocodeRequests += 1
            return route.fulfill({ status: 500, body: 'nope' })
        })
        await page.route(FORECAST_URL, (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 } },
            })
        )
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ json: { current: { us_aqi: 42.7 } } }))

        await enableWeather(page)

        await expect(page.getByTestId('weather-card')).toBeVisible()
        await expect(page.getByText('Unknown').last()).toBeVisible()
        expect(geocodeRequests).toBe(1)

        // The unresolved name is not written to the cache, so a reload asks again.
        await page.reload()
        await expect(page.getByTestId('weather-card')).toBeVisible()
        await expect.poll(() => geocodeRequests).toBe(2)
    })

    test('reuses the cached reading instead of refetching', async ({ page }) => {
        let requests = 0
        page.on('request', (request) => {
            if (request.url().includes('open-meteo.com') || request.url().includes('api-bdc.io')) requests += 1
        })
        await page.route(GEOCODE_URL, (route) => route.fulfill({ json: { city: 'Testville' } }))
        await page.route(FORECAST_URL, (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 55.4, weather_code: 3 } },
            })
        )
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ json: { current: { us_aqi: 42.7 } } }))

        await enableWeather(page)
        const card = page.getByTestId('weather-card')
        await expect(card).toBeVisible()
        const initial = requests
        expect(initial).toBe(3)

        // Leaving and returning to Home remounts the widget but must not refetch.
        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await page.getByRole('button', { name: 'Home' }).click()
        await expect(card).toBeVisible()
        expect(requests).toBe(initial)

        // The session cache (including the geocoded place name) survives a reload.
        await page.reload()
        await expect(page.getByText('Testville').last()).toBeVisible()
        expect(requests).toBe(initial)
    })

    test('keeps the desktop card inside its bounds with long content', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) =>
            route.fulfill({
                json: {
                    city: 'Thiruvananthapuram',
                    locality: 'Thiruvananthapuram',
                    countryName: 'India',
                },
            })
        )
        await page.route(FORECAST_URL, (route) =>
            route.fulfill({
                json: { current: { temperature_2m: 27.6, relative_humidity_2m: 100, weather_code: 80 } },
            })
        )
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ json: { current: { us_aqi: 120 } } }))

        await enableWeather(page)

        const card = page.getByTestId('weather-card')
        await expect(card).toBeVisible()
        await expect(card).toHaveCSS('width', '440px')
        await expect(card.getByText('100%')).toBeVisible()
        expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    })

    test('shows a retry affordance when the service fails', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))
        await page.route(FORECAST_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))

        await enableWeather(page)

        await expect(page.getByText('Service Unavailable')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Retry weather' })).toBeVisible()
        const errorCard = page.getByTestId('weather-error')
        await expect(errorCard).toBeVisible()
        await expect(errorCard).toHaveCSS('width', '440px')
        expect(await errorCard.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    })

    test('does not request weather until the widget is enabled', async ({ page }) => {
        let requests = 0
        page.on('request', (request) => {
            if (request.url().includes('open-meteo.com') || request.url().includes('api-bdc.io')) requests += 1
        })

        await openHome(page)
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        expect(requests).toBe(0)
    })
})
