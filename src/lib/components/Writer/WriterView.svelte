<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { Editor } from '..'
    import {
        addWriteup,
        updateWriteup,
        deleteWriteup,
        getWriteup,
        loadWriteups,
    } from '$lib/stores/writeups'
    import { onDestroy, onMount } from 'svelte'
    import DraftsPanel from './DraftsPanel.svelte'

    let content = $state('')
    let currentWriteupId = $state<number | undefined>(undefined)
    let createdTimeInNum = $state<number | undefined>(undefined)
    let autosavedAt = $state<Date | null>(null)
    let saving = $state(false)
    let dirty = $state(false)

    let editorContentToLoad = $derived(currentWriteupId === undefined ? '# ' : content)

    const AUTOSAVE_DELAY = 1400 // ms
    let autosaveTimer = $state<number | undefined>(undefined)

    // Minimum time saving indicator must be visible (ms)
    const MIN_SAVE_DISPLAY_MS = 800

    // internal timestamp to ensure min display
    let _saveShownSince = $state(0)

    function ordinal(n: number) {
        const s = ["th", "st", "nd", "rd"]
        const v = n % 100
        return n + (s[(v - 20) % 10] || s[v] || s[0])
    }

    function formatAutosaveTime(d: Date | null) {
        if (!d) return ''
        // Format: "1st Jan 2025, 7:30 PM"
        // using toLocaleString for hour formatting but build day + month manually for consistent short month
        const day = ordinal(d.getDate())
        const month = d.toLocaleString(undefined, { month: 'short' }) // e.g., "Jan"
        const year = d.getFullYear()
        const time = d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
        return `${day} ${month} ${year}, ${time}`
    }

    let saveStatusText = $derived(saving
        ? 'Saving…'
        : autosavedAt
        ? `Saved ${formatAutosaveTime(autosavedAt)}`
        : 'Not saved yet')

    // Input change handler (debounced autosave)
    const handleInputChange = (markdown: string) => {
        content = markdown
        dirty = true

        if (autosaveTimer) {
            clearTimeout(autosaveTimer)
        }
        autosaveTimer = window.setTimeout(() => {
            autosaveTimer = undefined
            saveDraftIfNeeded()
        }, AUTOSAVE_DELAY)
    }

    // Save function: create or update writeup
    async function saveDraftIfNeeded(force = false) {
        if (!dirty && !force) return

        // If already saving, don't start another save; but we still want to set dirty->false after this completes
        if (saving) {
            // allow concurrent attempts to queue a new save afterwards — for now keep it simple and return
            return
        }

        saving = true
        _saveShownSince = Date.now()

        try {
            if (typeof currentWriteupId === 'number') {
                await updateWriteup(currentWriteupId, content)
            } else {
                const newId = await addWriteup(content, createdTimeInNum)
                currentWriteupId = newId
            }
            autosavedAt = new Date()
            dirty = false
        } catch (err) {
            console.error('Autosave failed', err)
            // TODO: show user-facing notification if you have a notifications store
        } finally {
            // ensure saving indicator remains visible for MIN_SAVE_DISPLAY_MS
            const elapsed = Date.now() - _saveShownSince
            const remaining = Math.max(0, MIN_SAVE_DISPLAY_MS - elapsed)
            setTimeout(() => {
                saving = false
            }, remaining)
        }
    }

    // choose a draft from panel
    async function openDraft(id: number) {
        // if current content is dirty, force-save before switching (safer UX)
        if (dirty) {
            await saveDraftIfNeeded(true)
        }
        const w = await getWriteup(id)
        if (!w) return
        content = w.content
        currentWriteupId = w.id
        createdTimeInNum = w.createdAt
        dirty = false
        autosavedAt = w.updatedAt ? new Date(w.updatedAt) : autosavedAt
    }

    // create new draft
    function createNewDraft() {
        currentWriteupId = undefined
        createdTimeInNum = Date.now()
        content = '# '
        dirty = false
        autosavedAt = null
    }

    async function removeDraft(id: number) {
        await deleteWriteup(id)
        if (id === currentWriteupId) {
            createNewDraft()
        }
    }

    // lifecycle hooks
    onMount(async () => {
        await loadWriteups()

        const onBeforeUnload = async (e: BeforeUnloadEvent) => {
            if (dirty) {
                // attempt sync save (best-effort)
                await saveDraftIfNeeded(true)
            }
            // allow unload
        }
        window.addEventListener('beforeunload', onBeforeUnload)

        onDestroy(() => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            if (autosaveTimer) clearTimeout(autosaveTimer)
        })
    })

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-56' : '')
</script>

<div class={`container mx-auto p-4 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="flex gap-8">
        <div class="flex-1">
            <!-- top bar: combined saving + timestamp (single location) -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <!-- you can add more controls here (title, actions) -->
                </div>
                <!-- unified status area -->
                <div class="text-sm italic text-slate-400 flex items-center gap-2">
                    {#if saving}
                        <!-- small spinner + saving text; animate-pulse makes it noticeable but not loud -->
                        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
                            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                        </svg>
                    {/if}
                    <span>{saveStatusText}</span>
                </div>
            </div>
            {#key createdTimeInNum ?? "new"}
                <div class="mt-4 ml-20 transition-opacity duration-200 ease-in-out">
                    <Editor initialContent={editorContentToLoad} onInputChange={handleInputChange} />
                </div>
            {/key}
        </div>
        <DraftsPanel
            {createNewDraft}
            {currentWriteupId}
            {openDraft}
            {removeDraft}
        />
    </div>
</div>
