export interface BrowserSite {
    url: string
    title: string
}

interface PermissionsApi {
    contains?: (permissions: { permissions: string[] }, callback: (granted: boolean) => void) => void
    request?: (permissions: { permissions: string[] }, callback: (granted: boolean) => void) => void
}

interface ChromeLike {
    topSites?: {
        get?: (callback: (sites: BrowserSite[]) => void) => void
    }
    permissions?: PermissionsApi
}

type GlobalWithBrowserApis = typeof globalThis & {
    chrome?: ChromeLike
    browser?: ChromeLike
}

export function getChromeApi(): ChromeLike | undefined {
    const global = globalThis as GlobalWithBrowserApis
    return global.chrome ?? global.browser
}

export function isExtensionContext(): boolean {
    if (typeof window === 'undefined') return false
    return window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:'
}

function normalizeTopSite(site: BrowserSite): BrowserSite | null {
    if (!site || typeof site.url !== 'string') return null
    const url = site.url.trim()
    if (!/^https?:\/\//i.test(url)) return null
    try {
        const parsed = new URL(url)
        const fallbackTitle = parsed.hostname.replace(/^www\./, '')
        const title = typeof site.title === 'string' && site.title.trim() ? site.title.trim() : fallbackTitle
        return { url: parsed.href, title }
    } catch {
        return null
    }
}

export function getTopSites(): Promise<BrowserSite[]> {
    const topSites = getChromeApi()?.topSites
    if (!topSites?.get) return Promise.resolve([])
    return new Promise((resolve) => {
        topSites.get!((sites) => {
            const seen = new Set<string>()
            const normalized: BrowserSite[] = []
            for (const site of sites ?? []) {
                const next = normalizeTopSite(site)
                if (!next || seen.has(next.url)) continue
                seen.add(next.url)
                normalized.push(next)
            }
            resolve(normalized)
        })
    })
}

function queryPermission(method: 'contains' | 'request', name: string): Promise<boolean> {
    const permissions = getChromeApi()?.permissions
    const fn = permissions?.[method]
    if (!fn) return Promise.resolve(true)
    return new Promise((resolve) => {
        fn.call(permissions, { permissions: [name] }, resolve)
    })
}

export function hasPermission(name: string): Promise<boolean> {
    return queryPermission('contains', name)
}

export function requestPermission(name: string): Promise<boolean> {
    return queryPermission('request', name)
}
