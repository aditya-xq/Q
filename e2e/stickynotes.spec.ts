import { expect, test, type Locator, type Page } from '@playwright/test'
import { openHome } from './helpers'

interface StoredPoint {
    text: string
    done: boolean
}

interface StoredNote {
    points: StoredPoint[]
    x: number
    y: number
    color: string
}

/** Read the notes straight from IndexedDB so persistence assertions are not racy. */
async function readNotes(page: Page): Promise<StoredNote[]> {
    return page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('MyAppDB')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
        const notes = await new Promise<StoredNote[]>((resolve, reject) => {
            const request = db.transaction('notes', 'readonly').objectStore('notes').getAll()
            request.onsuccess = () => resolve(request.result as StoredNote[])
            request.onerror = () => reject(request.error)
        })
        db.close()
        return notes
    })
}

/** Wait until a note's rendered position stops changing (the glide has finished). */
async function waitForSettled(note: Locator) {
    let previous: { x: number; y: number } | null = null
    await expect
        .poll(
            async () => {
                const box = await note.boundingBox()
                if (!box) return false
                const still =
                    previous !== null && Math.abs(box.x - previous.x) < 0.5 && Math.abs(box.y - previous.y) < 0.5
                previous = { x: box.x, y: box.y }
                return still
            },
            { timeout: 5000 }
        )
        .toBe(true)
}

/** Type the points and commit with a double Enter (the trailing blank is dropped). */
async function writeNote(page: Page, note: Locator, ...points: string[]) {
    const staged = await note.boundingBox()
    await note
        .getByRole('textbox')
        .first()
        .fill(points[0] ?? '')
    for (const point of points.slice(1)) {
        await page.keyboard.press('Enter')
        await note.getByRole('textbox').last().fill(point)
    }
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    // A freshly finished note glides to a parking slot: wait for it to move, then settle.
    if (staged) {
        await expect
            .poll(
                async () => {
                    const box = await note.boundingBox()
                    return box ? Math.abs(box.x - staged.x) + Math.abs(box.y - staged.y) : 0
                },
                { timeout: 5000 }
            )
            .toBeGreaterThan(20)
    }
    await waitForSettled(note)
}

test.describe('Sticky notes', () => {
    test('Alt+Q creates a note, finishing it saves and it persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await expect(note).toHaveCount(1)
        await expect(note.getByRole('textbox').first()).toBeFocused()

        await writeNote(page, note, 'Buy oat milk')
        await expect(note.getByRole('textbox')).toHaveValue('Buy oat milk')

        await expect
            .poll(async () =>
                (await readNotes(page)).some((stored) => stored.points.some((point) => point.text === 'Buy oat milk'))
            )
            .toBe(true)

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect(page.getByTestId('sticky-note').getByRole('textbox')).toHaveValue('Buy oat milk')
    })

    test('Enter adds points and a double Enter finishes, dropping the blank point', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').first().fill('First point')
        await page.keyboard.press('Enter')

        const points = note.getByRole('textbox')
        await expect(points).toHaveCount(2)
        await expect(points.nth(1)).toBeFocused()

        await points.nth(1).fill('Second point')
        await page.keyboard.press('Enter')
        await expect(points).toHaveCount(3)

        await page.keyboard.press('Enter')
        await expect(points).toHaveCount(2)

        await expect
            .poll(async () => (await readNotes(page))[0]?.points.map((point) => point.text).join('\n'))
            .toBe('First point\nSecond point')
    })

    test('the finish hint is visible from the start of drafting', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        const hint = note.getByTestId('sticky-note-finish-hint')
        await expect(hint).toBeVisible()

        await note.getByRole('textbox').first().fill('First point')
        await expect(hint).toBeVisible()

        await page.keyboard.press('Enter')
        await expect(hint).toBeVisible()

        await page.keyboard.press('Enter')
        await expect(hint).toHaveCount(0)
    })

    test('Enter splits a point at the caret', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        const first = note.getByRole('textbox').first()
        await first.fill('FirstSecond')
        await first.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(5, 5))
        await page.keyboard.press('Enter')

        const points = note.getByRole('textbox')
        await expect(points).toHaveCount(2)
        await expect(points.nth(0)).toHaveValue('First')
        await expect(points.nth(1)).toHaveValue('Second')

        // Tab commits (focus leaves the note); Enter would split the focused point again.
        await page.keyboard.press('Tab')
        await expect
            .poll(async () => (await readNotes(page))[0]?.points.map((point) => point.text).join('|'))
            .toBe('First|Second')
    })

    test('a finished note glides from the centre to a free slot', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        const staged = await note.boundingBox()
        if (!staged) throw new Error('note not measurable')

        await note.getByRole('textbox').first().fill('Fly away')
        await page.keyboard.press('Enter')
        await page.keyboard.press('Enter')

        // Wait for the glide to carry the note away from the centre.
        await expect
            .poll(async () => {
                const box = await note.boundingBox()
                return box ? Math.abs(box.x - staged.x) + Math.abs(box.y - staged.y) : 0
            })
            .toBeGreaterThan(40)

        // It stays where it landed and the position is persisted.
        await page.waitForTimeout(900)
        const settled = await note.boundingBox()
        const stored = (await readNotes(page))[0]
        if (!settled || !stored) throw new Error('note not measurable')
        expect(Math.abs(stored.x - settled.x)).toBeLessThan(2)
        expect(Math.abs(stored.y - settled.y)).toBeLessThan(2)
    })

    test('the glide animates rather than jumping', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        const staged = await note.boundingBox()
        await note.getByRole('textbox').first().fill('Glide')
        await page.keyboard.press('Enter')
        await page.keyboard.press('Enter')

        await page.waitForTimeout(140)
        const mid = await note.boundingBox()
        await page.waitForTimeout(900)
        const settled = await note.boundingBox()
        if (!staged || !mid || !settled) throw new Error('note not measurable')

        const total = Math.abs(settled.x - staged.x) + Math.abs(settled.y - staged.y)
        const travelled = Math.abs(mid.x - staged.x) + Math.abs(mid.y - staged.y)
        expect(total).toBeGreaterThan(40)
        expect(travelled).toBeGreaterThan(0)
        expect(travelled).toBeLessThan(total - 2)
    })

    test('a note can be dragged by its whole bar and the position persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'Drag me')

        const before = await note.boundingBox()
        const bar = note.getByTestId('sticky-note-bar')
        const barBox = await bar.boundingBox()
        if (!before || !barBox) throw new Error('note not measurable')

        // Grab the middle of the bar, not just the corner handle.
        const startX = barBox.x + barBox.width / 2
        const startY = barBox.y + barBox.height / 2
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(startX - 140, startY + 100, { steps: 10 })
        await page.mouse.up()

        const after = await note.boundingBox()
        if (!after) throw new Error('note not measurable')
        expect(before.x - after.x).toBeGreaterThan(60)
        expect(after.y - before.y).toBeGreaterThan(50)

        await expect.poll(async () => (await readNotes(page))[0]?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(before.x)

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        const persisted = await page.getByTestId('sticky-note').boundingBox()
        if (!persisted) throw new Error('note not measurable')
        expect(Math.abs(persisted.x - after.x)).toBeLessThan(4)
        expect(Math.abs(persisted.y - after.y)).toBeLessThan(4)
    })

    test('deleting a note dissolves it and Undo restores it', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const notes = page.getByTestId('sticky-note')
        await writeNote(page, notes, 'Throwaway')

        await notes.getByRole('button', { name: 'Delete note' }).click()
        await expect(notes).toHaveCount(0, { timeout: 5000 })

        const undo = page.getByTestId('sticky-note-undo')
        await expect(undo).toBeVisible()
        await undo.getByRole('button', { name: 'Undo' }).click()

        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
        await expect(page.getByTestId('sticky-note').getByRole('textbox')).toHaveValue('Throwaway')
    })

    test('an empty note is discarded on Escape', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)

        await page.keyboard.press('Escape')
        await expect(page.getByTestId('sticky-note')).toHaveCount(0, { timeout: 5000 })
    })

    test('the hint creates a note and stays available', async ({ page }) => {
        await openHome(page)
        const hint = page.getByTestId('sticky-note-hint')
        await expect(hint).toBeVisible()

        await hint.click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
        await expect(hint).toBeVisible()
    })

    test('Alt+Q from another view jumps home and creates the note', async ({ page }) => {
        await openHome(page)
        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await expect(page).toHaveURL(/view=projects/)

        await page.keyboard.press('Alt+q')
        await expect(page).not.toHaveURL(/view=projects/)
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
    })

    test('notes only appear on the home view', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')
        await writeNote(page, page.getByTestId('sticky-note'), 'Board only')

        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(0)

        await page.getByRole('button', { name: 'Home', exact: true }).click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
    })

    test('a note colour can be changed from the palette and persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'Colourful')

        const current = await note.getAttribute('data-color')
        const target = current === 'rose' ? 'emerald' : 'rose'

        await note.getByRole('button', { name: 'Change note colour' }).click()
        await expect(page.getByRole('button', { name: /^Colour / })).toHaveCount(6)
        await page.getByRole('button', { name: `Colour ${target}` }).click()
        await expect(note).toHaveAttribute('data-color', target)

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect(page.getByTestId('sticky-note')).toHaveAttribute('data-color', target)
    })

    test('a note can be nudged with the keyboard and it persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'Nudge me')

        await note.getByTestId('sticky-note-handle').focus()
        const before = await note.boundingBox()
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('Shift+ArrowDown')

        const after = await note.boundingBox()
        if (!before || !after) throw new Error('note not measurable')
        expect(after.x - before.x).toBe(2)
        expect(after.y - before.y).toBe(10)

        await expect
            .poll(async () => {
                const stored = (await readNotes(page))[0]
                return stored ? Math.abs(stored.y - (before.y + 10)) : Number.POSITIVE_INFINITY
            })
            .toBeLessThan(2)

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        const persisted = await page.getByTestId('sticky-note').boundingBox()
        if (!persisted) throw new Error('note not measurable')
        expect(Math.abs(persisted.x - after.x)).toBeLessThan(2)
        expect(Math.abs(persisted.y - after.y)).toBeLessThan(2)
    })

    test('the colour palette closes when clicking outside the note', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'Palette')

        await note.getByRole('button', { name: 'Change note colour' }).click()
        await expect(page.getByRole('toolbar', { name: 'Note colour' })).toBeVisible()

        await page.mouse.click(5, 5)
        await expect(page.getByRole('toolbar', { name: 'Note colour' })).toHaveCount(0)
    })

    test('each point has its own checkbox and completion persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'First point', 'Second point')

        const checkboxes = note.getByRole('checkbox')
        await expect(checkboxes).toHaveCount(2)

        const labels = note.locator('label:has(input[type="checkbox"])')
        await labels.nth(0).click()
        await expect(checkboxes.nth(0)).toBeChecked()
        await expect(checkboxes.nth(1)).not.toBeChecked()

        await expect
            .poll(async () => (await readNotes(page))[0]?.points.map((point) => point.done))
            .toEqual([true, false])

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        const reloaded = page.getByTestId('sticky-note').getByRole('checkbox')
        await expect(reloaded.nth(0)).toBeChecked()
        await expect(reloaded.nth(1)).not.toBeChecked()
    })

    test('undo restores several recently dismissed notes', async ({ page }) => {
        await openHome(page)

        await page.keyboard.press('Alt+q')
        await writeNote(page, page.getByTestId('sticky-note').nth(0), 'First')
        await page.keyboard.press('Alt+q')
        await writeNote(page, page.getByTestId('sticky-note').nth(1), 'Second')

        const notes = page.getByTestId('sticky-note')
        await expect(notes).toHaveCount(2)

        await notes.nth(0).getByRole('button', { name: 'Delete note' }).click()
        await expect(notes).toHaveCount(1, { timeout: 5000 })
        await notes.nth(0).getByRole('button', { name: 'Delete note' }).click()
        await expect(notes).toHaveCount(0, { timeout: 5000 })

        const undo = page.getByTestId('sticky-note-undo')
        await expect(undo).toContainText('2 notes dismissed')
        await undo.getByRole('button', { name: 'Undo' }).click()
        await expect(notes).toHaveCount(1)
        await undo.getByRole('button', { name: 'Undo' }).click()
        await expect(notes).toHaveCount(2)
    })
})

test.describe('Sticky notes (reduced motion)', () => {
    test.use({ reducedMotion: 'reduce' })

    test('deleting still removes the note without the dust burst', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await writeNote(page, note, 'Fade out')

        await note.getByRole('button', { name: 'Delete note' }).click()
        await expect(note).toHaveCount(0, { timeout: 3000 })
        await expect(page.getByTestId('sticky-note-undo')).toBeVisible()
    })
})
