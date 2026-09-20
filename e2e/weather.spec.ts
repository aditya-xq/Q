import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 52.52, longitude: 13.405 },
})

const GEOCODE_URL = 'https://api.bigdatacloud.net/**'
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

    test('shows a retry affordance when the service fails', async ({ page }) => {
        await page.route(GEOCODE_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))
        await page.route(FORECAST_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))
        await page.route(AIR_QUALITY_URL, (route) => route.fulfill({ status: 500, body: 'nope' }))

        await enableWeather(page)

        await expect(page.getByText('Service Unavailable')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Retry weather' })).toBeVisible()
    })

    test('does not request weather until the widget is enabled', async ({ page }) => {
        let requests = 0
        page.on('request', (request) => {
            if (request.url().includes('open-meteo.com') || request.url().includes('bigdatacloud.net')) requests += 1
        })

        await openHome(page)
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        expect(requests).toBe(0)
    })
})
