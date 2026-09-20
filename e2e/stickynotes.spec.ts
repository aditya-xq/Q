import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

interface StoredNote {
    text: string
    x: number
    y: number
    color: string
    pinned: boolean
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

test.describe('Sticky notes', () => {
    test('Alt+Q creates a note, Enter saves it and it persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await expect(note).toHaveCount(1)

        const textarea = note.getByRole('textbox')
        await expect(textarea).toBeFocused()
        await textarea.fill('Buy oat milk')
        await page.keyboard.press('Enter')
        await expect(textarea).toHaveValue('Buy oat milk')

        await expect
            .poll(async () => (await readNotes(page)).some((stored) => stored.text === 'Buy oat milk'))
            .toBe(true)

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect(page.getByTestId('sticky-note').getByRole('textbox')).toHaveValue('Buy oat milk')
    })

    test('a note can be dragged and the position persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').fill('Drag me')
        await page.keyboard.press('Enter')

        const before = await note.boundingBox()
        const handle = note.getByTestId('sticky-note-handle')
        const handleBox = await handle.boundingBox()
        if (!before || !handleBox) throw new Error('note not measurable')

        const startX = handleBox.x + handleBox.width / 2
        const startY = handleBox.y + handleBox.height / 2
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
        expect(Math.abs(persisted.x - after.x)).toBeLessThan(3)
        expect(Math.abs(persisted.y - after.y)).toBeLessThan(3)
    })

    test('deleting a note dissolves it and Undo restores it', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const notes = page.getByTestId('sticky-note')
        await notes.getByRole('textbox').fill('Throwaway')
        await page.keyboard.press('Enter')

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
        await expect(page.getByTestId('sticky-note-hint')).toBeVisible()
    })

    test('the hint creates a note and retires once notes exist', async ({ page }) => {
        await openHome(page)
        const hint = page.getByTestId('sticky-note-hint')
        await expect(hint).toBeVisible()

        await hint.click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
        await expect(hint).toBeHidden()
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
        await page.getByTestId('sticky-note').getByRole('textbox').fill('Board only')
        await page.keyboard.press('Enter')

        await page.getByRole('button', { name: 'Projects (Alt + P)' }).click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(0)

        await page.getByRole('button', { name: 'Home', exact: true }).click()
        await expect(page.getByTestId('sticky-note')).toHaveCount(1)
    })

    test('a note colour can be changed from the palette and persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').fill('Colourful')
        await page.keyboard.press('Enter')

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

    test('pinning a note locks it against dragging', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').fill('Locked')
        await page.keyboard.press('Enter')

        await note.getByRole('button', { name: 'Pin note in place' }).click()
        await expect(note).toHaveAttribute('data-pinned', 'true')

        const before = await note.boundingBox()
        const handleBox = await note.getByTestId('sticky-note-handle').boundingBox()
        if (!before || !handleBox) throw new Error('note not measurable')

        const startX = handleBox.x + handleBox.width / 2
        const startY = handleBox.y + handleBox.height / 2
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(startX - 120, startY + 100, { steps: 8 })
        await page.mouse.up()

        const after = await note.boundingBox()
        if (!after) throw new Error('note not measurable')
        expect(Math.abs(after.x - before.x)).toBeLessThan(2)
        expect(Math.abs(after.y - before.y)).toBeLessThan(2)

        await note.getByRole('button', { name: 'Unpin note' }).click()
        await expect(note).toHaveAttribute('data-pinned', 'false')
    })

    test('a note can be nudged with the keyboard and it persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').fill('Nudge me')
        await page.keyboard.press('Enter')

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
        await note.getByRole('textbox').fill('Palette')
        await page.keyboard.press('Enter')

        await note.getByRole('button', { name: 'Change note colour' }).click()
        await expect(page.getByRole('toolbar', { name: 'Note colour' })).toBeVisible()

        await page.mouse.click(5, 5)
        await expect(page.getByRole('toolbar', { name: 'Note colour' })).toHaveCount(0)
    })

    test('marking a note done persists', async ({ page }) => {
        await openHome(page)
        await page.keyboard.press('Alt+q')

        const note = page.getByTestId('sticky-note')
        await note.getByRole('textbox').fill('Done task')
        await page.keyboard.press('Enter')

        await note.locator('label:has(input[type="checkbox"])').click()
        await expect(note).toHaveAttribute('aria-label', 'Sticky note (done)')

        await page.reload()
        await expect(page.getByText('Queue', { exact: true })).toBeVisible()
        await expect(page.getByTestId('sticky-note')).toHaveAttribute('aria-label', 'Sticky note (done)')
    })

    test('undo restores several recently dismissed notes', async ({ page }) => {
        await openHome(page)

        await page.keyboard.press('Alt+q')
        await page.getByTestId('sticky-note').nth(0).getByRole('textbox').fill('First')
        await page.keyboard.press('Enter')
        await page.keyboard.press('Alt+q')
        await page.getByTestId('sticky-note').nth(1).getByRole('textbox').fill('Second')
        await page.keyboard.press('Enter')

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
        await note.getByRole('textbox').fill('Fade out')
        await page.keyboard.press('Enter')

        await note.getByRole('button', { name: 'Delete note' }).click()
        await expect(note).toHaveCount(0, { timeout: 3000 })
        await expect(page.getByTestId('sticky-note-undo')).toBeVisible()
    })
})
