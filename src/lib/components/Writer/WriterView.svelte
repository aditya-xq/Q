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
    let loading = $state(true)

    let editorContentToLoad = $derived(currentWriteupId === undefined ? '# ' : content)

    const AUTOSAVE_DELAY = 1200 // ms
    let autosaveTimer = $state<number | undefined>(undefined)

    // Minimum time saving indicator must be visible (ms)
    const MIN_SAVE_DISPLAY_MS = 600

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
                const newId = await addWriteup(content, Date.now())
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

    const onBeforeUnload = async (e: BeforeUnloadEvent) => {
        if (dirty) {
            // attempt sync save (best-effort)
            await saveDraftIfNeeded(true)
        }
        // allow unload
    }

    // lifecycle hooks
    onMount(async () => {
        loading = true
        await loadWriteups()
        // Give a tiny delay to ensure reactivity has settled
        await new Promise(resolve => setTimeout(resolve, 0))
        loading = false
        window.addEventListener('beforeunload', onBeforeUnload)
    })

    onDestroy(() => {
        window.removeEventListener('beforeunload', onBeforeUnload)
        if (autosaveTimer) clearTimeout(autosaveTimer)
    })

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-56' : '')

    // Mobile sidebar state
    let mobileMenuOpen = $state(false)
    let isAnimating = $state(false)
    
    function toggleMobileMenu() {
        if (mobileMenuOpen) {
            closeMobileMenu()
        } else {
            openMobileMenu()
        }
    }
    
    function openMobileMenu() {
        mobileMenuOpen = true
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden'
        
        // Force a reflow to ensure the panel renders off-screen first
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                isAnimating = true
            })
        })
    }
    
    function closeMobileMenu() {
        isAnimating = false
        // Wait for animation to complete before hiding
        setTimeout(() => {
            mobileMenuOpen = false
            document.body.style.overflow = ''
        }, 300)
    }
    
    // Clean up on component destroy
    onDestroy(() => {
        document.body.style.overflow = ''
    })
</script>

<div class={`container mx-auto p-3 sm:p-4 md:p-6 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="flex gap-4 lg:gap-8 relative">
        <div class="flex-1 min-w-0">
            <!-- Top bar -->
            <div class="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <!-- Left side content if needed -->
                </div>
                
                <!-- Right side: status + drafts button -->
                <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                    <!-- Unified status area -->
                    <div class="text-xs sm:text-sm italic text-slate-400 flex items-center gap-1.5 sm:gap-2">
                        {#if saving}
                            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
                                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                            </svg>
                        {/if}
                        <span class="hidden sm:inline whitespace-nowrap">{saveStatusText}</span>
                        <span class="sm:hidden whitespace-nowrap">{saving ? 'Saving...' : 'Saved'}</span>
                    </div>
                    
                    <!-- Mobile controls: New + Drafts buttons -->
                    {#if !loading}
                        <div class="md:hidden flex items-center gap-1.5 sm:gap-2">
                            <!-- New draft button -->
                            <button
                                class="group rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow active:scale-95"
                                onclick={createNewDraft}
                                aria-label="Create new draft"
                            >
                                <div class="flex items-center gap-1 sm:gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-all group-hover:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">New</span>
                                </div>
                            </button>
                            <!-- Drafts panel button -->
                            <button
                                class="group relative rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow active:scale-95"
                                onclick={toggleMobileMenu}
                                aria-label="Open drafts"
                            >
                                <div class="flex items-center gap-1.5 sm:gap-2">
                                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <span class="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">Drafts</span>
                                </div>
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
            
            {#key createdTimeInNum ?? "new"}
                <div class="transition-opacity duration-200 ease-in-out ml-6 md:ml-40 2xl:ml-20">
                    <Editor initialContent={editorContentToLoad} onInputChange={handleInputChange} />
                </div>
            {/key}
        </div>
        
        {#if !loading}
            <!-- Desktop sidebar - hidden on mobile -->
            <div class="hidden md:block">
                <DraftsPanel
                    {createNewDraft}
                    {currentWriteupId}
                    {openDraft}
                    {removeDraft}
                />
            </div>
            
            <!-- Mobile sidebar -->
            {#if mobileMenuOpen}
                <!-- Backdrop -->
                <div
                    class="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                    class:opacity-0={!isAnimating}
                    class:opacity-100={isAnimating}
                    onclick={closeMobileMenu}
                    onkeydown={closeMobileMenu}
                    aria-label="Close drafts panel"
                    role="button"
                    tabindex="-1"
                ></div>
                
                <!-- Sliding panel from right -->
                <div 
                    class="md:hidden fixed right-0 top-0 bottom-0 w-84 max-w-[85vw] bg-slate-50 dark:bg-slate-950 z-50 shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out"
                    class:translate-x-0={isAnimating}
                    class:translate-x-full={!isAnimating}
                >
                    <!-- Header with pen icon and close -->
                    <div class="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-3 sm:py-3.5 flex justify-between items-center z-10">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <h3 class="text-xs sm:text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase opacity-60">
                                Drafts
                            </h3>
                        </div>
                        <button
                            class="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-95"
                            onclick={closeMobileMenu}
                            aria-label="Close drafts panel"
                        >
                            <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Panel content -->
                    <div class="px-2 py-3 sm:py-4">
                        <DraftsPanel
                            {createNewDraft}
                            {currentWriteupId}
                            openDraft={(id: number) => {
                                openDraft(id)
                                closeMobileMenu()
                            }}
                            {removeDraft}
                        />
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    /* Ensure smooth scrolling on mobile */
    :global(body.menu-open) {
        overflow: hidden;
    }
</style>
