import { appState } from '$lib/state.svelte'
import { getSetting, setSetting } from '$lib/utils/db'
import {
    DEFAULT_PRESET,
    DEFAULT_THEME,
    THEME_SETTING_KEY,
    THEME_STORAGE_KEY,
    getPreset,
    normalizeTheme,
    parseStoredTheme,
    parseThemeCache,
    presetToTheme,
    resolveMode,
    serializeStoredTheme,
    themeColor,
    themeToVars,
    toThemeCache,
    type ThemeConfig,
} from '$lib/utils/theme'

let saveTimer: ReturnType<typeof setTimeout> | undefined
let mediaQuery: MediaQueryList | null = null
let onMediaChange: ((event: MediaQueryListEvent) => void) | null = null
let onStorage: ((event: StorageEvent) => void) | null = null
let initialized = false
/** Timestamp of the last user change; the cache and IndexedDB row carry it so a
 *  reload can never let a lagging debounced write roll a newer theme back. */
let lastSavedAt = 0

function prefersDark(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Mirror the resolved theme to localStorage so app.html can paint it before hydration. */
function writeCache(theme: ThemeConfig, savedAt: number): void {
    if (typeof localStorage === 'undefined') return
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(toThemeCache(theme, savedAt)))
    } catch {
        /* storage unavailable (private mode / quota) */
    }
}

/** Reading can throw when storage is blocked; treat that as "no cache". */
function readCache(): string | null {
    if (typeof localStorage === 'undefined') return null
    try {
        return localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
        return null
    }
}

/** Write every token to <html>; callers only need to pass the config. */
export function applyTheme(theme: ThemeConfig, savedAt = lastSavedAt): void {
    if (typeof document === 'undefined') return
    const resolved = resolveMode(theme.mode, prefersDark())
    const vars = themeToVars(theme, resolved)
    const root = document.documentElement

    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value)
    root.classList.toggle('dark', resolved === 'dark')
    root.dataset.surface = theme.surface
    root.style.colorScheme = resolved
    appState.themeResolved = resolved

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', themeColor(theme, resolved))

    writeCache(theme, savedAt)
}

function persist(theme: ThemeConfig, savedAt: number): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        saveTimer = undefined
        void setSetting(THEME_SETTING_KEY, serializeStoredTheme(theme, savedAt)).catch((error) =>
            console.error('Failed to save theme', error)
        )
    }, 200)
}

export function setTheme(patch: Partial<ThemeConfig>): void {
    const next = normalizeTheme({ ...appState.theme, ...patch })
    // Strictly increasing, so two changes in the same millisecond cannot tie and let
    // an older IndexedDB row win the next reconciliation.
    lastSavedAt = Math.max(Date.now(), lastSavedAt + 1)
    appState.theme = next
    applyTheme(next, lastSavedAt)
    persist(next, lastSavedAt)
}

export function setThemeMode(mode: ThemeConfig['mode']): void {
    setTheme({ mode })
}

export function applyThemePreset(presetId: string): void {
    const preset = getPreset(presetId)
    if (!preset) return
    setTheme(presetToTheme(preset, appState.theme.mode))
}

/** Restore the default look while keeping the user's light/dark preference. */
export function resetTheme(): void {
    setTheme(presetToTheme(DEFAULT_PRESET, appState.theme.mode))
}

export function openThemeDesigner(): void {
    appState.themeDesignerOpen = true
}

export function closeThemeDesigner(): void {
    appState.themeDesignerOpen = false
}

export function toggleThemeDesigner(): void {
    appState.themeDesignerOpen = !appState.themeDesignerOpen
}

export async function initTheme(): Promise<void> {
    if (initialized || typeof window === 'undefined') return
    initialized = true

    // Paint immediately from the cache the pre-paint script already used, then reconcile
    // with IndexedDB. `savedAt` decides which copy is newer.
    const cached = parseThemeCache(readCache())
    const initial = cached?.theme ?? DEFAULT_THEME
    lastSavedAt = cached?.savedAt ?? 0
    const startingSavedAt = lastSavedAt
    appState.theme = initial
    applyTheme(initial, lastSavedAt)

    // Subscribe before the async read so a change made while it is in flight (another
    // tab's storage event) can never be lost.
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    onMediaChange = () => {
        if (appState.theme.mode === 'system') applyTheme(appState.theme)
    }
    mediaQuery.addEventListener('change', onMediaChange)

    onStorage = (event) => {
        if (event.key !== THEME_STORAGE_KEY || !event.newValue) return
        const next = parseThemeCache(event.newValue)
        if (!next) return
        lastSavedAt = next.savedAt
        appState.theme = next.theme
        applyTheme(next.theme, next.savedAt)
    }
    window.addEventListener('storage', onStorage)

    try {
        const raw = await getSetting(THEME_SETTING_KEY)
        const stored = parseStoredTheme(typeof raw === 'string' ? raw : null)
        // A change made while the row was loading is newer than anything the read can
        // return — never overwrite it.
        if (lastSavedAt === startingSavedAt) {
            if (stored && (!cached || stored.savedAt >= cached.savedAt)) {
                lastSavedAt = stored.savedAt
                appState.theme = stored.theme
                applyTheme(stored.theme, stored.savedAt)
            } else if (cached) {
                // The cache is newer than the row (a write was still pending): converge.
                persist(cached.theme, cached.savedAt)
            }
        }
    } catch (error) {
        console.error('Failed to load theme', error)
    }
}

export function destroyTheme(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = undefined
    if (mediaQuery && onMediaChange) mediaQuery.removeEventListener('change', onMediaChange)
    if (onStorage) window.removeEventListener('storage', onStorage)
    mediaQuery = null
    onMediaChange = null
    onStorage = null
    initialized = false
}
