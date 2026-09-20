import { afterEach, describe, expect, test } from 'bun:test'
import { getChromeApi, getTopSites, hasPermission, isExtensionContext, requestPermission } from '$lib/utils/browser'

type GlobalWithApis = typeof globalThis & { chrome?: unknown; browser?: unknown }
const globals = globalThis as GlobalWithApis

afterEach(() => {
    delete globals.chrome
    delete globals.browser
})

describe('getChromeApi', () => {
    test('returns undefined when no browser API is present', () => {
        delete globals.chrome
        delete globals.browser
        expect(getChromeApi()).toBeUndefined()
    })

    test('prefers chrome over browser and returns the API object', () => {
        const chromeApi = { topSites: undefined }
        const browserApi = { topSites: undefined }
        globals.chrome = chromeApi
        globals.browser = browserApi
        expect(getChromeApi()).toBe(chromeApi)
    })
})

describe('isExtensionContext', () => {
    test('is false outside an extension page', () => {
        expect(isExtensionContext()).toBe(false)
    })
})

describe('getTopSites', () => {
    test('resolves to an empty list without the API', async () => {
        expect(await getTopSites()).toEqual([])
    })

    test('returns sites from the extension API', async () => {
        const sites = [{ url: 'https://x.com', title: 'X' }]
        globals.chrome = {
            topSites: {
                get: (cb: (sites: { url: string; title: string }[]) => void) => cb(sites),
            },
        }
        expect(await getTopSites()).toEqual(sites)
    })
})

describe('permissions', () => {
    test('assumes granted when the permissions API is unavailable', async () => {
        expect(await hasPermission('geolocation')).toBe(true)
        expect(await requestPermission('geolocation')).toBe(true)
    })

    test('forwards results from the permissions API', async () => {
        globals.chrome = {
            permissions: {
                contains: (_permissions: unknown, cb: (granted: boolean) => void) => cb(false),
                request: (_permissions: unknown, cb: (granted: boolean) => void) => cb(true),
            },
        }
        expect(await hasPermission('geolocation')).toBe(false)
        expect(await requestPermission('geolocation')).toBe(true)
    })
})
