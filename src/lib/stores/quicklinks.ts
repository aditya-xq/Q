import { db, ensureDBReady, type QuickLink } from '$lib/utils/db'

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
