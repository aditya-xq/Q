import { expect, test } from '@playwright/test'

type SeedWindow = Window & { __seeded?: boolean; __seedError?: string }

// Creates a version-1 database (matching the pre-v2 schema) with representative data,
// so the app's Dexie `version(3)` upgrade has something real to migrate.
const SEED_SCRIPT = `
(() => {
    const req = indexedDB.open('MyAppDB', 1)
    req.onupgradeneeded = () => {
        const db = req.result
        const writeups = db.createObjectStore('writeups', { keyPath: 'id', autoIncrement: true })
        writeups.createIndex('content', 'content')
        writeups.createIndex('updatedAt', 'updatedAt')
        writeups.createIndex('createdAt', 'createdAt')
        const projects = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true })
        projects.createIndex('title', 'title')
        projects.createIndex('createdAt', 'createdAt')
        const tasks = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
        tasks.createIndex('projectId', 'projectId')
        tasks.createIndex('text', 'text')
        tasks.createIndex('completed', 'completed')
        tasks.createIndex('createdAt', 'createdAt')
        tasks.createIndex('updatedAt', 'updatedAt')
        const quicklinks = db.createObjectStore('quicklinks', { keyPath: 'id', autoIncrement: true })
        quicklinks.createIndex('category', 'category')
        quicklinks.createIndex('name', 'name')
        quicklinks.createIndex('url', 'url')
        db.createObjectStore('settings', { keyPath: 'key' })
    }
    req.onerror = () => { window.__seedError = String(req.error) }
    req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['projects', 'tasks', 'writeups', 'quicklinks', 'settings'], 'readwrite')
        tx.objectStore('projects').add({ title: 'Migrated Project', createdAt: new Date(2026, 0, 1) })
        tx.objectStore('tasks').add({
            projectId: 1,
            text: 'Migrated Task',
            completed: false,
            createdAt: new Date(2026, 0, 1),
            updatedAt: new Date(2026, 0, 1),
        })
        tx.objectStore('writeups').add({
            content: '# Migrated Draft',
            createdAt: new Date(2026, 0, 1).getTime(),
            updatedAt: new Date(2026, 0, 1),
        })
        tx.objectStore('settings').put({ key: 'showQuote', value: false })
        tx.oncomplete = () => { window.__seeded = true }
        tx.onerror = () => { window.__seedError = String(tx.error) }
    }
})()
`

test.describe('Database migration', () => {
    test('upgrades a v1 database to v3 without losing data', async ({ page }) => {
        const isRoot = (url: URL) => url.pathname === '/'
        await page.route(isRoot, async (route) => {
            if (route.request().resourceType() !== 'document') {
                await route.fallback()
                return
            }
            await route.fulfill({
                contentType: 'text/html',
                body: `<!doctype html><html><head><meta charset="utf-8" /></head><body><script>${SEED_SCRIPT}</script></body></html>`,
            })
        })

        // Seed a v1 database before the app (which opens v2) ever runs.
        await page.goto('/')
        await page.waitForFunction(() => {
            const w = window as SeedWindow
            return w.__seeded === true || Boolean(w.__seedError)
        })
        expect(await page.evaluate(() => (window as SeedWindow).__seedError ?? null)).toBeNull()
        await page.unrouteAll()

        // Loading the app now triggers the Dexie v1 -> v3 upgrade.
        await page.goto('/?view=projects')
        await expect(page.getByRole('heading', { name: 'Migrated Project', level: 1 })).toBeVisible()
        await expect(page.getByText('Migrated Task', { exact: true })).toBeVisible()

        // Write-ups survive and get a derived title on read.
        await page.goto('/?view=writer')
        await expect(page.locator('.milkdown .ProseMirror')).toBeVisible({ timeout: 20_000 })
        await expect(page.getByText('Migrated Draft').first()).toBeVisible()

        // v2 dropped the free-text `content` index (and createdAt) from writeups.
        const indexNames = await page.evaluate(async () => {
            return await new Promise<string[]>((resolve, reject) => {
                const request = indexedDB.open('MyAppDB')
                request.onsuccess = () => {
                    const db = request.result
                    const store = db.transaction('writeups', 'readonly').objectStore('writeups')
                    resolve(Array.from(store.indexNames))
                }
                request.onerror = () => reject(request.error)
            })
        })
        expect(indexNames).toContain('updatedAt')
        expect(indexNames).not.toContain('content')
        expect(indexNames).not.toContain('createdAt')

        // v3 adds the sticky notes store.
        const storeNames = await page.evaluate(async () => {
            return await new Promise<string[]>((resolve, reject) => {
                const request = indexedDB.open('MyAppDB')
                request.onsuccess = () => {
                    const db = request.result
                    resolve(Array.from(db.objectStoreNames))
                }
                request.onerror = () => reject(request.error)
            })
        })
        expect(storeNames).toContain('notes')
    })
})
