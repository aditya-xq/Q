export interface SessionCacheEntry<T> {
    data: T
    /** Epoch milliseconds when the entry was written. */
    ts: number
}

/** Read and validate a sessionStorage entry written by `writeSessionCache`. */
export function readSessionCache<T>(key: string, isValid: (value: unknown) => value is T): SessionCacheEntry<T> | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as { ts?: unknown; data?: unknown }
        if (!parsed || typeof parsed.ts !== 'number' || !isValid(parsed.data)) return null
        return { data: parsed.data, ts: parsed.ts }
    } catch {
        return null
    }
}

/** Write a sessionStorage entry and return its timestamp (also on quota/private-mode failures). */
export function writeSessionCache<T>(key: string, data: T): number {
    const ts = Date.now()
    try {
        sessionStorage.setItem(key, JSON.stringify({ ts, data }))
    } catch {
        /* storage unavailable (private mode / quota) */
    }
    return ts
}

export function isSessionCacheFresh(entry: SessionCacheEntry<unknown>, ttlMs: number, now = Date.now()): boolean {
    return now - entry.ts < ttlMs
}
