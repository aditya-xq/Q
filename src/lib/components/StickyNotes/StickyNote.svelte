<script lang="ts">
    import { onDestroy, onMount, tick, untrack } from 'svelte'
    import type { Note } from '$lib/utils/db'
    import { deleteNote, updateNote } from '$lib/stores/notes'
    import { clampToViewport, NOTE_COLORS, NOTE_HEIGHT, NOTE_WIDTH, type NoteColor } from '$lib/utils/notes'
    import { nextNoteZ, NOTE_Z_BASE } from '$lib/state.svelte'
    import { NOTE_THEME } from './noteTheme'

    interface Props {
        note: Note
        autoFocus?: boolean
        onDeleted?: (note: Note) => void
        onFocused?: () => void
    }

    let { note, autoFocus = false, onDeleted, onFocused }: Props = $props()

    interface Dust {
        id: number
        left: number
        top: number
        size: number
        dx: number
        dy: number
        rot: number
        delay: number
        dur: number
        color: string
    }

    let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined)
    let noteEl = $state<HTMLElement | undefined>(undefined)
    let cardEl = $state<HTMLElement | undefined>(undefined)
    let colorButtonEl = $state<HTMLButtonElement | undefined>(undefined)
    let paletteEl = $state<HTMLElement | undefined>(undefined)
    // Local editable copies seeded from the stored note; synced below.
    let draft = $state(untrack(() => note.text))
    let lastCommitted = untrack(() => note.text)
    let x = $state(untrack(() => note.x))
    let y = $state(untrack(() => note.y))
    let z = $state(NOTE_Z_BASE)
    let dragging = $state(false)
    let exiting = $state(false)
    let editing = $state(false)
    let dust = $state<Dust[]>([])
    let paletteOpen = $state(false)
    let paletteIndex = $state(0)
    let liveMessage = $state('')
    let skipSave = false
    let moved = false
    let grabX = 0
    let grabY = 0
    let moveTimer: ReturnType<typeof setTimeout> | undefined

    let theme = $derived(NOTE_THEME[note.color as NoteColor] ?? NOTE_THEME.amber)
    let paletteId = $derived(`note-colour-${note.id ?? 'new'}`)

    $effect(() => {
        const incoming = note.text
        // Only adopt external changes; never clobber the draft mid-save (avoids a flicker).
        if (!editing && incoming !== lastCommitted) {
            lastCommitted = incoming
            draft = incoming
            void tick().then(fitTextarea)
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
        if (autoFocus && textareaEl) {
            textareaEl.focus()
            textareaEl.setSelectionRange(textareaEl.value.length, textareaEl.value.length)
            onFocused?.()
        }
    })

    // Keep the note on screen and persist the clamp when the window changes.
    onMount(() => {
        const reclamp = () => {
            if (dragging) return
            const { width, height } = noteSize()
            const position = clampToViewport(x, y, window.innerWidth, window.innerHeight, width, height)
            x = position.x
            y = position.y
        }
        reclamp()
        window.addEventListener('resize', reclamp)
        return () => window.removeEventListener('resize', reclamp)
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

    function fitTextarea() {
        const node = textareaEl
        if (!node) return
        node.style.height = 'auto'
        node.style.height = `${node.scrollHeight}px`
    }

    function autosize(node: HTMLTextAreaElement) {
        const fit = () => {
            node.style.height = 'auto'
            node.style.height = `${node.scrollHeight}px`
        }
        fit()
        node.addEventListener('input', fit)
        return { destroy: () => node.removeEventListener('input', fit) }
    }

    function bringToFront() {
        z = nextNoteZ()
    }

    function onPointerDown(event: PointerEvent) {
        if (exiting || note.pinned) return
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
            closePalette()
            return
        }
        if (note.pinned) return
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
            closePalette()
            return
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        const delta = event.key === 'ArrowRight' ? 1 : -1
        paletteIndex = (paletteIndex + delta + NOTE_COLORS.length) % NOTE_COLORS.length
        paletteEl?.querySelectorAll<HTMLButtonElement>('button')[paletteIndex]?.focus()
    }

    function togglePinned() {
        bringToFront()
        liveMessage = note.pinned ? 'Note unpinned' : 'Note pinned'
        void updateNote(note.id!, { pinned: !note.pinned })
    }

    function toggleDone() {
        bringToFront()
        void updateNote(note.id!, { done: !note.done })
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            textareaEl?.blur()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            skipSave = true
            if (!note.text.trim()) {
                void dismiss()
                return
            }
            draft = note.text
            void tick().then(fitTextarea)
            textareaEl?.blur()
        }
    }

    async function onBlur() {
        editing = false
        if (skipSave) {
            skipSave = false
            return
        }
        const text = draft.trim()
        if (!text) {
            void dismiss()
            return
        }
        if (text !== note.text) {
            await updateNote(note.id!, { text })
        }
        lastCommitted = text
    }

    function prefersReducedMotion() {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    function buildDust(colors: string[]): Dust[] {
        const particles: Dust[] = []
        for (let i = 0; i < 48; i++) {
            particles.push({
                id: i,
                left: Math.random() * 100,
                top: Math.random() * 100,
                size: 2 + Math.random() * 5,
                dx: (Math.random() - 0.5) * 96,
                dy: -18 - Math.random() * 78,
                rot: (Math.random() - 0.5) * 240,
                delay: Math.random() * 120,
                dur: 380 + Math.random() * 240,
                color: colors[Math.floor(Math.random() * colors.length)],
            })
        }
        return particles
    }

    /** Resolve when the dissolve animation finishes (or after a safety fallback). */
    function waitForDissolve(): Promise<void> {
        const node = cardEl
        if (!node) return Promise.resolve()
        const target = node
        return new Promise<void>((resolve) => {
            function finish() {
                clearTimeout(fallback)
                target.removeEventListener('animationend', onAnimationEnd)
                resolve()
            }
            function onAnimationEnd(event: AnimationEvent) {
                // Ignore bubbled dust-particle animations.
                if (event.target === target) finish()
            }
            const fallback = setTimeout(finish, 1200)
            target.addEventListener('animationend', onAnimationEnd)
        })
    }

    async function dismiss() {
        if (exiting) return
        exiting = true
        dragging = false
        if (!prefersReducedMotion()) {
            dust = buildDust(theme.dust)
        }
        await waitForDissolve()
        await deleteNote(note.id!)
        onDeleted?.(note)
    }
</script>

<div
    bind:this={noteEl}
    class="fixed"
    style:left={`${x}px`}
    style:top={`${y}px`}
    style:z-index={z}
    data-testid="sticky-note"
    data-color={note.color}
    data-pinned={note.pinned}
    role="group"
    aria-label={note.done ? 'Sticky note (done)' : 'Sticky note'}
>
    <div
        bind:this={cardEl}
        class={`sticky-note relative rounded-xl border shadow-lg ${theme.paper} ${theme.border} ${
            exiting ? 'sticky-note--exiting' : ''
        } ${dragging ? 'sticky-note--dragging' : ''}`}
        style:--rot={`${note.rotation}deg`}
        style:width={`min(${NOTE_WIDTH}px, calc(100vw - 24px))`}
    >
        <!-- Handle, colour, pin, delete -->
        <div class="flex items-center justify-between px-2 pt-1.5 pb-0.5">
            <button
                type="button"
                class={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] tracking-[0.15em] ${theme.accent} opacity-40 transition hover:bg-black/5 hover:opacity-80 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:outline-none dark:hover:bg-white/10 dark:focus-visible:ring-slate-100/30 ${
                    note.pinned ? 'cursor-default' : 'cursor-grab touch-none active:cursor-grabbing'
                }`}
                data-testid="sticky-note-handle"
                aria-label={note.pinned ? 'Note pinned in place' : 'Move note (drag or arrow keys)'}
                title={note.pinned ? 'Pinned' : 'Drag or use arrow keys'}
                onpointerdown={onPointerDown}
                onpointermove={onPointerMove}
                onpointerup={onPointerUp}
                onpointercancel={onPointerUp}
                onkeydown={onHandleKeydown}
            >
                <span aria-hidden="true">⠿</span>
            </button>

            <div class="flex items-center gap-0.5">
                <div class="relative">
                    <button
                        bind:this={colorButtonEl}
                        type="button"
                        class={`flex h-6 w-6 items-center justify-center rounded-md ${theme.accent} opacity-50 transition hover:bg-black/5 hover:opacity-90 dark:hover:bg-white/10`}
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
                            class="absolute top-7 right-0 z-10 flex gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                            role="toolbar"
                            aria-label="Note colour"
                            tabindex="-1"
                            onkeydown={onPaletteKeydown}
                        >
                            {#each NOTE_COLORS as option, index (option)}
                                <button
                                    type="button"
                                    class={`h-4 w-4 rounded-full ring-1 ring-black/10 transition hover:scale-110 ${
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
                    class={`flex h-6 w-6 items-center justify-center rounded-md ${theme.accent} transition hover:bg-black/5 dark:hover:bg-white/10 ${
                        note.pinned ? 'opacity-90' : 'opacity-40 hover:opacity-80'
                    }`}
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note in place'}
                    aria-pressed={note.pinned}
                    onpointerdown={(event) => event.stopPropagation()}
                    onclick={togglePinned}
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill={note.pinned ? 'currentColor' : 'none'}>
                        <path
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z"
                        />
                    </svg>
                </button>

                <button
                    type="button"
                    class={`flex h-6 w-6 items-center justify-center rounded-md ${theme.accent} opacity-40 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10`}
                    aria-label="Delete note"
                    onpointerdown={(event) => event.stopPropagation()}
                    onclick={(event) => {
                        event.stopPropagation()
                        void dismiss()
                    }}
                >
                    ✕
                </button>
            </div>
        </div>

        <div class="flex items-start gap-2.5 px-3 pb-3">
            <label class="mt-1 flex-shrink-0 cursor-pointer" title={note.done ? 'Mark not done' : 'Mark done'}>
                <input type="checkbox" class="peer sr-only" checked={note.done} onchange={toggleDone} />
                <span
                    class={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        note.done
                            ? 'border-transparent bg-slate-900/70 dark:bg-slate-100/80'
                            : 'border-slate-900/25 dark:border-slate-100/30'
                    }`}
                >
                    {#if note.done}
                        <svg class="h-3 w-3 text-white dark:text-slate-900" viewBox="0 0 24 24" fill="none">
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
                <span class="sr-only">{note.done ? 'Mark note not done' : 'Mark note done'}</span>
            </label>

            <textarea
                bind:this={textareaEl}
                bind:value={draft}
                use:autosize
                rows={1}
                placeholder="Jot something…"
                class={`w-full resize-none overflow-y-auto bg-transparent text-sm leading-snug ${theme.accent} max-h-[40vh] placeholder:text-slate-900/30 focus:outline-none dark:placeholder:text-slate-100/30 ${
                    note.done ? 'line-through opacity-60' : ''
                }`}
                onfocus={() => {
                    editing = true
                    bringToFront()
                }}
                onblur={onBlur}
                onkeydown={onKeydown}
            ></textarea>
        </div>

        <span class="sr-only" aria-live="polite">{liveMessage}</span>

        {#if dust.length}
            <div class="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
                {#each dust as particle (particle.id)}
                    <span
                        class="dust"
                        style:left={`${particle.left}%`}
                        style:top={`${particle.top}%`}
                        style:width={`${particle.size}px`}
                        style:height={`${particle.size}px`}
                        style:background={particle.color}
                        style:--dx={`${particle.dx}px`}
                        style:--dy={`${particle.dy}px`}
                        style:--dust-rot={`${particle.rot}deg`}
                        style:--delay={`${particle.delay}ms`}
                        style:--dur={`${particle.dur}ms`}
                    ></span>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .sticky-note {
        transform: rotate(var(--rot, 0deg));
        transition:
            transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 220ms ease;
        animation: note-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 10px 22px -12px rgba(15, 23, 42, 0.5);
    }

    .sticky-note:hover {
        transform: rotate(calc(var(--rot, 0deg) * 0.35)) translateY(-2px);
        box-shadow: 0 16px 28px -14px rgba(15, 23, 42, 0.55);
    }

    .sticky-note--dragging {
        transition: none;
        transform: rotate(0deg) scale(1.03);
        box-shadow: 0 22px 36px -16px rgba(15, 23, 42, 0.6);
    }

    .sticky-note--exiting {
        animation: note-dissolve 560ms ease-in forwards;
        pointer-events: none;
    }

    @keyframes note-pop {
        from {
            opacity: 0;
            transform: rotate(var(--rot, 0deg)) scale(0.85);
        }
    }

    @keyframes note-dissolve {
        0% {
            opacity: 1;
            filter: blur(0);
            transform: rotate(var(--rot, 0deg)) scale(1);
        }
        100% {
            opacity: 0;
            filter: blur(7px);
            transform: rotate(var(--rot, 0deg)) translateY(-14px) scale(1.06);
        }
    }

    .dust {
        position: absolute;
        border-radius: 9999px;
        opacity: 0;
        animation: dust-fly var(--dur, 500ms) ease-out var(--delay, 0ms) forwards;
    }

    @keyframes dust-fly {
        0% {
            opacity: 0.95;
            transform: translate3d(0, 0, 0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate3d(var(--dx, 0), var(--dy, -30px), 0) rotate(var(--dust-rot, 0deg)) scale(0.2);
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

        .sticky-note--exiting {
            animation: note-fade 180ms ease forwards;
        }

        .dust {
            display: none;
        }
    }

    @keyframes note-fade {
        to {
            opacity: 0;
        }
    }
</style>
