import { appState } from '$lib/state.svelte'
import { db, ensureDBReady, type QuickLink } from '$lib/utils/db'
import { resolveQuickLinks } from '$lib/utils/constants'
import { liveQuery, type Subscription } from 'dexie'

export async function getQuickLinkByCategory(category: string): Promise<QuickLink | undefined> {
    await ensureDBReady()
    return db.quicklinks.where('category').equals(category).first()
}

export async function upsertQuickLink(row: QuickLink): Promise<void> {
    await ensureDBReady()
    const existing = await db.quicklinks.where('category').equals(row.category).first()
    if (existing?.id != null) {
        await db.quicklinks.update(existing.id, row)
    } else {
        await db.quicklinks.add(row)
    }
}

// Keeps the rail (and the category shortcuts) in sync with the stored links.
export function observeQuickLinks(): Subscription {
    return liveQuery(() => db.quicklinks.toArray().then(resolveQuickLinks)).subscribe({
        next: (links) => {
            appState.quickLinks = links
        },
        error: (error) => console.error('Quick link observation failed:', error),
    })
}
