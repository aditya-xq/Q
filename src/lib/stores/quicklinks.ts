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
    // Never pass the primary key back into `update`, and keep the read/write atomic
    // so two settings panels cannot insert the same category.
    const values: QuickLink = { category: row.category, name: row.name, url: row.url }
    await db.transaction('rw', db.quicklinks, async () => {
        const existing = await db.quicklinks.where('category').equals(row.category).first()
        if (existing?.id != null) {
            await db.quicklinks.update(existing.id, values)
        } else {
            await db.quicklinks.add(values)
        }
    })
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
