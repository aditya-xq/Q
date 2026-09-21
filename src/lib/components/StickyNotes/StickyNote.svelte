<script lang="ts">
    import { onDestroy, onMount, tick, untrack } from 'svelte'
    import type { Note, NotePoint } from '$lib/utils/db'
    import { deleteNote, updateNote, consumeStagedNote } from '$lib/stores/notes'
    import {
        clampToViewport,
        cleanPoints,
        hasPointContent,
        nextFreeNoteSlot,
        NOTE_COLORS,
        NOTE_HEIGHT,
        NOTE_WIDTH,
        type NoteColor,
        type Rect,
    } from '$lib/utils/notes'
    import { appState, nextNoteZ, NOTE_Z_BASE } from '$lib/state.svelte'
    import { NOTE_THEME } from './noteTheme'

    interface Props {
        note: Note
        autoFocus?: boolean
        /** Position used for the staggered entrance, or null for notes created this session. */
        staggerIndex?: number | null
        onDeleted?: (note: Note) => void
        onFocused?: () => void
        /** `board` = free-floating desktop note; `card` = in-flow note inside the mobile stack. */
        variant?: 'board' | 'card'
    }

    let { note, autoFocus = false, staggerIndex = null, onDeleted, onFocused, variant = 'board' }: Props = $props()

    // The variant never changes for a mounted note, so read it once.
    const isCard = untrack(() => variant === 'card')

    // Frozen once at mount: a later change (e.g. the note no longer being staged)
    // must never re-trigger the finished note-pop animation.
    const enterDelay = untrack(() => (isCard || staggerIndex === null ? 0 : Math.min(staggerIndex * 70, 420)))

    interface Point extends NotePoint {
        id: number
    }

    const FLIGHT_MS = 700
    /** Must match the `note-vanish` exit animation length. */
    const DISMISS_MS = 240
    /** Swatches per row in the colour picker (must match the `grid-cols-*` class). */
    const PALETTE_COLUMNS = 5

    let noteEl = $state<HTMLElement | undefined>(undefined)
    let colorButtonEl = $state<HTMLButtonElement | undefined>(undefined)
    let paletteEl = $state<HTMLElement | undefined>(undefined)
    let nextPointId = 1

    function makePoints(list: readonly NotePoint[]): Point[] {
        const source = list.length > 0 ? list : [{ text: '', done: false }]
        return source.map((point) => ({ id: nextPointId++, text: point.text, done: point.done }))
    }

    // Local editable copy seeded from the stored note; synced below.
    let points = $state<Point[]>(untrack(() => makePoints(note.points)))
    let lastCommitted = untrack(() => JSON.stringify(note.points))
    let x = $state(untrack(() => note.x))
    let y = $state(untrack(() => note.y))
    let z = $state(NOTE_Z_BASE)
    let dragging = $state(false)
    let exiting = $state(false)
    let flying = $state(false)
    let editing = $state(false)
    let paletteOpen = $state(false)
    let paletteIndex = $state(0)
    let liveMessage = $state('')
    let didAutoFocus = false
    let moved = false
    let grabX = 0
    let grabY = 0
    let moveTimer: ReturnType<typeof setTimeout> | undefined

    let theme = $derived(NOTE_THEME[note.color as NoteColor] ?? NOTE_THEME.amber)
    let paletteId = $derived(`note-colour-${note.id ?? 'new'}`)
    // Always visible while drafting, so the double-Enter gesture is discoverable.
    let showFinishHint = $derived(editing)

    $effect(() => {
        const incoming = JSON.stringify(note.points)
        // Only adopt external changes; never clobber the draft mid-edit (avoids a flicker).
        if (!editing && incoming !== lastCommitted) {
            lastCommitted = incoming
            points = makePoints(note.points)
            void tick().then(reflow)
        }
    })

    // Dismiss the colour palette when clicking anywhere outside the note.
    $effect(() => {
        if (!paletteOpen) return
        const onDocumentPointerDown = (event: PointerEvent) => {
            if (noteEl && !noteEl.contains(event.target as Node)) {
                closePalette(false)
            }
        }
        document.addEventListener('pointerdown', onDocumentPointerDown)
        return () => document.removeEventListener('pointerdown', onDocumentPointerDown)
    })

    $effect(() => {
        if (autoFocus && !didAutoFocus) {
            didAutoFocus = true
            void focusPoint(points[0].id).then(() => onFocused?.())
        }
    })

    // Refit and pull the note back on screen when the window changes.
    onMount(() => {
        reflow()
        // Cards are in-flow and never clamped, so they don't need a resize listener.
        if (isCard) return
        const onResize = () => {
            reflow()
            schedulePositionSave()
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    })

    onDestroy(() => {
        if (moveTimer) clearTimeout(moveTimer)
    })

    function noteSize() {
        return {
            width: noteEl?.offsetWidth ?? NOTE_WIDTH,
            height: noteEl?.offsetHeight ?? NOTE_HEIGHT,
        }
    }

    function fitTextarea(node: HTMLTextAreaElement) {
        node.style.height = 'auto'
        node.style.height = `${node.scrollHeight}px`
    }

    function fitAll() {
        for (const node of noteEl?.querySelectorAll<HTMLTextAreaElement>('textarea') ?? []) {
            fitTextarea(node)
        }
    }

    /** Pull the note back inside the viewport (no-op while dragging, in card mode, or before binding). */
    function clampIntoView() {
        // `use:autosize`'s initial fit runs before `bind:this` lands, so there is
        // nothing measurable yet; clamping with the default size would shift the note.
        if (dragging || isCard || !noteEl) return
        const { width, height } = noteSize()
        const position = clampToViewport(x, y, window.innerWidth, window.innerHeight, width, height)
        x = position.x
        y = position.y
    }

    /** Refit the points and pull the note back on screen after it changes size. */
    function reflow() {
        fitAll()
        clampIntoView()
    }

    function autosize(node: HTMLTextAreaElement, onResize?: () => void) {
        const fit = () => {
            fitTextarea(node)
            onResize?.()
        }
        fit()
        node.addEventListener('input', fit)
        return { destroy: () => node.removeEventListener('input', fit) }
    }

    async function focusPoint(id: number, caret?: number) {
        await tick()
        const node = noteEl?.querySelector<HTMLTextAreaElement>(`[data-point-id="${id}"]`)
        if (!node) return
        node.focus()
        const position = caret ?? node.value.length
        node.setSelectionRange(position, position)
    }

    function bringToFront() {
        z = nextNoteZ()
    }

    function onPointerDown(event: PointerEvent) {
        if (exiting || isCard) return
        bringToFront()
        dragging = true
        moved = false
        grabX = event.clientX - x
        grabY = event.clientY - y
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
        event.preventDefault()
    }

    function onPointerMove(event: PointerEvent) {
        if (!dragging) return
        moved = true
        const { width, height } = noteSize()
        const position = clampToViewport(
            event.clientX - grabX,
            event.clientY - grabY,
            window.innerWidth,
            window.innerHeight,
            width,
            height
        )
        x = position.x
        y = position.y
    }

    function onPointerUp(event: PointerEvent) {
        if (!dragging) return
        dragging = false
        ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
        if (moved) void updateNote(note.id!, { x, y })
    }

    function schedulePositionSave() {
        if (moveTimer) clearTimeout(moveTimer)
        moveTimer = setTimeout(() => {
            moveTimer = undefined
            void updateNote(note.id!, { x, y })
        }, 320)
    }

    function onHandleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && paletteOpen) {
            // Keep Escape scoped to the palette so it never reaches a document-level handler.
            event.stopPropagation()
            closePalette()
            return
        }
        const step = event.shiftKey ? 10 : 1
        let dx = 0
        let dy = 0
        if (event.key === 'ArrowLeft') dx = -step
        else if (event.key === 'ArrowRight') dx = step
        else if (event.key === 'ArrowUp') dy = -step
        else if (event.key === 'ArrowDown') dy = step
        else return
        event.preventDefault()
        bringToFront()
        const { width, height } = noteSize()
        const position = clampToViewport(x + dx, y + dy, window.innerWidth, window.innerHeight, width, height)
        x = position.x
        y = position.y
        liveMessage = `Note moved to ${Math.round(x)}, ${Math.round(y)}`
        schedulePositionSave()
    }

    function selectColor(color: NoteColor) {
        closePalette()
        if (color !== note.color) void updateNote(note.id!, { color })
    }

    async function togglePalette() {
        paletteOpen = !paletteOpen
        if (paletteOpen) {
            paletteIndex = Math.max(0, NOTE_COLORS.indexOf(note.color as NoteColor))
            await tick()
            paletteEl?.querySelectorAll<HTMLButtonElement>('button')[paletteIndex]?.focus()
        }
    }

    function closePalette(restoreFocus = true) {
        if (!paletteOpen) return
        paletteOpen = false
        if (restoreFocus) colorButtonEl?.focus()
    }

    function onPaletteKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault()
            // Keep Escape scoped to the palette; on mobile it must not also close the sheet.
            event.stopPropagation()
            closePalette()
            return
        }
        let delta = 0
        if (event.key === 'ArrowRight') delta = 1
        else if (event.key === 'ArrowLeft') delta = -1
        else if (event.key === 'ArrowDown') delta = PALETTE_COLUMNS
        else if (event.key === 'ArrowUp') delta = -PALETTE_COLUMNS
        else return
        event.preventDefault()
        paletteIndex = (paletteIndex + delta + NOTE_COLORS.length) % NOTE_COLORS.length
        paletteEl?.querySelectorAll<HTMLButtonElement>('button')[paletteIndex]?.focus()
    }

    function togglePointDone(index: number) {
        const point = points[index]
        if (!point) return
        bringToFront()
        point.done = !point.done
        const payload = cleanPoints(points)
        if (payload.length === 0) return
        lastCommitted = JSON.stringify(payload)
        void updateNote(note.id!, { points: payload })
    }

    function onPointKeydown(event: KeyboardEvent, index: number) {
        const point = points[index]
        if (!point) return
        const node = event.currentTarget as HTMLTextAreaElement

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            // A second Enter on an empty point finishes the note and drops the blank.
            if (point.text.trim() === '') {
                if (points.length > 1) points.splice(index, 1)
                void finish()
                return
            }
            // Split at the caret so Enter behaves like a real list item.
            const caret = node.selectionStart ?? point.text.length
            const created = { id: nextPointId++, text: point.text.slice(caret), done: false }
            point.text = point.text.slice(0, caret)
            points.splice(index + 1, 0, created)
            void focusPoint(created.id, 0).then(reflow)
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            // Keep Escape scoped to the edit; on mobile it must not also close the sheet.
            event.stopPropagation()
            cancelEdit()
            return
        }

        if (event.key === 'Backspace' && point.text === '' && points.length > 1) {
            event.preventDefault()
            points.splice(index, 1)
            const next = points[Math.max(0, index - 1)]
            if (next) void focusPoint(next.id)
            return
        }

        // Move between points only at the text boundaries, so wrapped points
        // (Shift+Enter) still navigate their own caret normally.
        if (event.key === 'ArrowUp' && index > 0 && node.selectionStart === 0 && node.selectionEnd === 0) {
            event.preventDefault()
            void focusPoint(points[index - 1].id)
        } else if (
            event.key === 'ArrowDown' &&
            index < points.length - 1 &&
            node.selectionStart === node.value.length
        ) {
            event.preventDefault()
            void focusPoint(points[index + 1].id)
        }
    }

    function onPointBlur(event: FocusEvent) {
        const next = event.relatedTarget as Node | null
        // Focus staying inside the note (another point, the palette) is not a commit.
        if (next && noteEl?.contains(next)) return
        void finish()
    }

    function cancelEdit() {
        editing = false
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        if (!hasPointContent(note.points)) {
            void dismiss()
            return
        }
        points = makePoints(note.points)
        void tick().then(reflow)
    }

    async function finish() {
        if (!editing) return
        editing = false
        const payload = cleanPoints(points)
        if (payload.length === 0) {
            void dismiss()
            return
        }
        const serialized = JSON.stringify(payload)
        const raw = JSON.stringify(points.map((point) => ({ text: point.text, done: point.done })))
        if (serialized !== JSON.stringify(note.points)) await updateNote(note.id!, { points: payload })
        lastCommitted = serialized
        if (raw !== serialized) {
            points = makePoints(payload)
            void tick().then(reflow)
        }
        void settleIntoBoard()
    }

    /** Glide a freshly created note from the centre to its first free parking slot. */
    async function settleIntoBoard() {
        if (isCard) return
        if (!consumeStagedNote(note.id!)) return
        const { width, height } = noteSize()
        // Exclude this note itself (it sits at the centre while staged) from the occupancy check.
        const others = appState.notes.filter((other) => other.id !== note.id)
        const target = nextFreeNoteSlot(others, noteObstacles(), window.innerWidth, window.innerHeight, width, height)
        if (target.x === x && target.y === y) return
        // Enable the transition before moving, otherwise the note jumps instead of gliding.
        flying = true
        await tick()
        x = target.x
        y = target.y
        void updateNote(note.id!, { x, y })
        await wait(FLIGHT_MS)
        flying = false
    }

    /** Bounding boxes of the home content that notes must not cover. */
    function noteObstacles(): Rect[] {
        if (typeof document === 'undefined') return []
        return Array.from(document.querySelectorAll('[data-note-obstacle]')).map((node) => {
            const rect = node.getBoundingClientRect()
            return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        })
    }

    function wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function dismiss() {
        if (exiting) return
        exiting = true
        dragging = false
        editing = false
        paletteOpen = false
        consumeStagedNote(note.id!)
        // A little past DISMISS_MS so the fade completes before the row unmounts.
        await wait(DISMISS_MS + 60)
        await deleteNote(note.id!)
        onDeleted?.(note)
    }
</script>

<div
    bind:this={noteEl}
    class={isCard ? 'relative w-full' : `fixed ${flying ? 'note-flying' : ''}`}
    style:left={isCard ? undefined : `${x}px`}
    style:top={isCard ? undefined : `${y}px`}
    style:z-index={isCard ? undefined : z}
    data-testid="sticky-note"
    data-color={note.color}
    data-variant={variant}
    role="group"
    aria-label="Sticky note"
>
    <div
        class={`sticky-note group relative rounded-2xl border ${theme.paper} ${theme.border} ${
            exiting ? 'sticky-note--exiting' : ''
        } ${dragging ? 'sticky-note--dragging' : ''} ${isCard ? 'sticky-note--card' : ''}`}
        style:--rot={isCard ? '0deg' : `${note.rotation}deg`}
        style:--enter-delay={`${enterDelay}ms`}
        style:width={isCard ? '100%' : 'min(clamp(208px, 15vw, 272px), calc(100vw - 24px))'}
    >
        <!-- The whole bar is the drag surface; the buttons opt out. On cards the bar is static. -->
        <div
            class={`flex items-center px-2 pt-1.5 pb-0.5 ${
                isCard ? 'justify-end gap-1' : 'cursor-grab touch-none justify-between active:cursor-grabbing'
            }`}
            data-testid="sticky-note-bar"
            onpointerdown={isCard ? undefined : onPointerDown}
            onpointermove={isCard ? undefined : onPointerMove}
            onpointerup={isCard ? undefined : onPointerUp}
            onpointercancel={isCard ? undefined : onPointerUp}
        >
            {#if !isCard}
                <button
                    type="button"
                    class={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] tracking-[0.15em] ${theme.accent} opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10`}
                    data-testid="sticky-note-handle"
                    aria-label="Move note (drag the bar or use arrow keys)"
                    title="Drag the bar or use arrow keys"
                    onkeydown={onHandleKeydown}
                >
                    <span aria-hidden="true">⠿</span>
                </button>
            {/if}

            <div class="flex items-center gap-0.5">
                <div class="relative">
                    <button
                        bind:this={colorButtonEl}
                        type="button"
                        class={`flex ${isCard ? 'h-9 w-9' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-md ${theme.accent} transition-opacity duration-200 ${
                            isCard ? 'opacity-80' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                        } hover:bg-black/5 dark:hover:bg-white/10`}
                        aria-label="Change note colour"
                        aria-expanded={paletteOpen}
                        aria-controls={paletteId}
                        onpointerdown={(event) => event.stopPropagation()}
                        onclick={togglePalette}
                    >
                        <span
                            class="h-3 w-3 rounded-full ring-1 ring-black/15"
                            style:background={theme.swatch}
                            aria-hidden="true"
                        ></span>
                    </button>
                    {#if paletteOpen}
                        <div
                            bind:this={paletteEl}
                            id={paletteId}
                            class={`absolute top-8 right-0 z-10 grid w-max grid-cols-5 rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 ${
                                isCard ? 'gap-1.5 p-1.5' : 'gap-1 p-1'
                            }`}
                            role="toolbar"
                            aria-label="Note colour"
                            tabindex="-1"
                            onkeydown={onPaletteKeydown}
                        >
                            {#each NOTE_COLORS as option, index (option)}
                                <button
                                    type="button"
                                    class={`${
                                        isCard ? 'h-7 w-7' : 'h-5 w-5'
                                    } cursor-pointer rounded-full ring-1 ring-black/10 transition hover:scale-110 ${
                                        option === note.color ? 'ring-2 ring-slate-900/60 dark:ring-slate-100/70' : ''
                                    }`}
                                    style:background={NOTE_THEME[option].swatch}
                                    aria-label={`Colour ${option}`}
                                    title={option}
                                    tabindex={index === paletteIndex ? 0 : -1}
                                    onfocus={() => (paletteIndex = index)}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={() => selectColor(option)}
                                ></button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <button
                    type="button"
                    class={`flex ${isCard ? 'h-9 w-9' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-md ${theme.accent} transition-opacity duration-200 ${
                        isCard ? 'opacity-80' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                    } hover:bg-black/5 dark:hover:bg-white/10`}
                    aria-label="Delete note"
                    onpointerdown={(event) => event.stopPropagation()}
                    onclick={(event) => {
                        event.stopPropagation()
                        void dismiss()
                    }}
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"
                        />
                    </svg>
                </button>
            </div>
        </div>

        <div class="flex flex-col gap-1.5 px-3.5 pt-0.5 pb-3.5">
            {#each points as point, index (point.id)}
                <div class="flex items-start gap-2">
                    <label
                        class="flex flex-shrink-0 cursor-pointer p-0.5"
                        title={point.done ? 'Mark point not done' : 'Mark point done'}
                    >
                        <input
                            type="checkbox"
                            class="peer sr-only"
                            checked={point.done}
                            aria-label={point.text.trim() || `Point ${index + 1}`}
                            onchange={() => togglePointDone(index)}
                        />
                        <span
                            class={`flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] transition-all ${
                                point.done
                                    ? 'border-transparent bg-slate-900/70 dark:bg-slate-100/80'
                                    : 'border-slate-900/25 dark:border-slate-100/30'
                            }`}
                        >
                            {#if point.done}
                                <svg class="h-2.5 w-2.5 text-white dark:text-slate-900" viewBox="0 0 24 24" fill="none">
                                    <path
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            {/if}
                        </span>
                    </label>

                    <textarea
                        data-point-id={point.id}
                        bind:value={point.text}
                        use:autosize={clampIntoView}
                        rows={1}
                        aria-label={`Point ${index + 1}`}
                        placeholder={index === 0 ? 'Jot a point…' : ''}
                        class={`w-full resize-none overflow-y-auto bg-transparent p-0 text-[15px] leading-snug ${theme.accent} max-h-[40vh] placeholder:text-slate-400/80 focus:outline-none dark:placeholder:text-slate-500/80 ${
                            point.done ? 'line-through opacity-50' : ''
                        }`}
                        onfocus={() => {
                            editing = true
                            bringToFront()
                        }}
                        onblur={onPointBlur}
                        onkeydown={(event) => onPointKeydown(event, index)}
                    ></textarea>
                </div>
            {/each}

            {#if showFinishHint}
                <p
                    class="pr-0.5 text-right text-[10px] font-medium tracking-wide text-slate-400/90 dark:text-slate-500"
                    role="status"
                    data-testid="sticky-note-finish-hint"
                >
                    {#if isCard}
                        Saves automatically
                    {:else}
                        Press
                        <kbd class="rounded border border-slate-400/40 px-1 py-px text-[9px] dark:border-slate-500/40">
                            Enter
                        </kbd>
                        twice to finish
                    {/if}
                </p>
            {/if}
        </div>

        <span class="sr-only" aria-live="polite">{liveMessage}</span>
    </div>
</div>

<style>
    .sticky-note {
        transform: rotate(var(--rot, 0deg));
        transition:
            transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 200ms ease;
        animation: note-pop 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: var(--enter-delay, 0ms);
        box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 10px 24px -12px rgba(15, 23, 42, 0.45);
    }

    .sticky-note:hover {
        transform: rotate(calc(var(--rot, 0deg) * 0.4)) translateY(-2px);
        box-shadow:
            0 1px 3px rgba(15, 23, 42, 0.06),
            0 16px 32px -14px rgba(15, 23, 42, 0.5);
    }

    .sticky-note--dragging {
        transition: none;
        transform: rotate(0deg) scale(1.02);
        box-shadow: 0 18px 34px -18px rgba(15, 23, 42, 0.45);
    }

    /* Graceful glide when a finished note parks itself. */
    .note-flying {
        transition:
            left 700ms cubic-bezier(0.22, 1, 0.36, 1),
            top 700ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .note-flying .sticky-note {
        transform: rotate(calc(var(--rot, 0deg) * 0.4)) scale(1.02);
        box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 20px 36px -18px rgba(15, 23, 42, 0.45);
    }

    /* Quick, quiet exit: the note recedes with a short fade and shrink. */
    .sticky-note--exiting {
        pointer-events: none;
        animation: note-vanish 240ms ease-in forwards;
    }

    /* In-flow card used by the mobile notes stack: no tilt or lift (the stack applies its own). */
    .sticky-note--card {
        transform: none;
        box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.03),
            0 6px 18px -14px rgba(15, 23, 42, 0.3);
    }

    .sticky-note--card:hover {
        transform: none;
        box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.03),
            0 6px 18px -14px rgba(15, 23, 42, 0.3);
    }

    @keyframes note-pop {
        from {
            opacity: 0;
            transform: rotate(var(--rot, 0deg)) translateY(8px) scale(0.985);
        }
    }

    @keyframes note-vanish {
        to {
            opacity: 0;
            transform: rotate(var(--rot, 0deg)) scale(0.97);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .sticky-note,
        .sticky-note:hover,
        .sticky-note--dragging {
            animation: none;
            transition: none;
            transform: rotate(var(--rot, 0deg));
        }

        /* Re-enable the exit as a plain fade (no scale). */
        .sticky-note--exiting {
            animation: note-fade 200ms ease forwards;
        }

        /* Still a glide, just short and without the lift. */
        .note-flying {
            transition:
                left 240ms ease-out,
                top 240ms ease-out;
        }

        .note-flying .sticky-note {
            transform: rotate(var(--rot, 0deg));
        }
    }

    @keyframes note-fade {
        to {
            opacity: 0;
        }
    }
</style>
