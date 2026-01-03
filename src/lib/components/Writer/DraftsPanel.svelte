<script lang="ts">
    import { appState } from "$lib/state.svelte"
    import { deriveTitle } from "$lib/utils/utils"
    import { DeleteButton } from "../shared"
    import { slide } from "svelte/transition"
    import { cubicOut } from "svelte/easing"

    let { createNewDraft, currentWriteupId, openDraft, removeDraft } = $props()

    // --- Date Logic ---
    const now = () => new Date()
    
    function startOfDay(d: Date) {
        const x = new Date(d)
        x.setHours(0, 0, 0, 0)
        return x
    }

    function startOfWeek(d: Date) {
        const x = startOfDay(d)
        const day = x.getDay() // 0 (Sun) - 6
        const diff = (day + 6) % 5 // make Monday start of week
        x.setDate(x.getDate() - diff)
        return x
    }

    function isToday(date: Date) {
        return date >= startOfDay(now())
    }
    
    function isThisWeek(date: Date) {
        return date >= startOfWeek(now())
    }

    function formatRelative(date: Date) {
        const diff = Math.floor((+now() - +date) / 1000)
        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    // --- Derived State ---
    let writeups = $derived(appState.writeups || [])

    let today = $derived(writeups.filter(w => isToday(new Date(w.updatedAt))))
    
    // Exclude today's items from "This Week"
    let thisWeek = $derived(writeups.filter(w => 
        !isToday(new Date(w.updatedAt)) && isThisWeek(new Date(w.updatedAt))
    ))
    
    // Everything else
    let older = $derived(writeups.filter(w => 
        !isThisWeek(new Date(w.updatedAt))
    ))

    let openOlder = $state(false)
    // Show older section only if there are more than 10 records total
    let showOlderSection = $derived(today.length + thisWeek.length + older.length > 10)

    // --- Interactions ---
    function handleKeyCreate(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            createNewDraft()
        }
    }
</script>

<aside class="w-80 pl-4">
    <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase opacity-60">
            Drafts
        </h3>
        <button
            class="group flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-all hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
            onclick={createNewDraft}
            onkeydown={handleKeyCreate}
            aria-label="Create new draft"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition-transform group-hover:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>New</span>
        </button>
    </div>
    <div class="space-y-6">
        {#if writeups.length > 0}
            <div class="space-y-1">
                {#if showOlderSection}
                    {#each [...today, ...thisWeek] as w (w.id)}
                        <article 
                            class="group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-all
                            {w.id === currentWriteupId 
                                ? 'bg-white dark:bg-slate-800 dark:ring-slate-800' 
                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-900'}"
                        >
                            <button class="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus:outline-none" onclick={() => openDraft(w.id)}>
                                <span class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {deriveTitle(w.content) || 'Untitled Draft'}
                                </span>
                                <span class="truncate text-xs text-slate-300 group-hover:text-slate-400">
                                    {formatRelative(new Date(w.updatedAt))}
                                </span>
                            </button>
                            <div class="ml-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                <DeleteButton handleDelete={() => removeDraft(w.id)} />
                            </div>
                        </article>
                    {/each}
                    <section>
                        <button 
                            class="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" 
                            onclick={() => (openOlder = !openOlder)}
                        >
                            <span>Older</span>
                            <div class="flex items-center gap-1">
                            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-900">{older.length}</span>
                            <svg 
                                class="h-3 w-3 transform transition-transform duration-200 {openOlder ? 'rotate-90' : ''}" 
                                viewBox="0 0 20 20" fill="currentColor"
                            >
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                            </div>
                        </button>
                        {#if openOlder}
                            <div class="mt-1 space-y-1 pl-1" transition:slide={{ duration: 200, easing: cubicOut }}>
                                {#each older as w (w.id)}
                                    <article 
                                        class="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors
                                        {w.id === currentWriteupId ? 'bg-slate-100 dark:bg-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}"
                                    >
                                        <button class="flex min-w-0 flex-1 flex-col text-left focus:outline-none" onclick={() => openDraft(w.id)}>
                                            <span class="truncate text-sm text-slate-600 dark:text-slate-400 {w.id === currentWriteupId ? 'font-medium text-slate-900 dark:text-slate-100' : ''}">
                                                {deriveTitle(w.content)}
                                            </span>
                                            <span class="truncate text-[10px] text-slate-400">
                                                {new Date(w.updatedAt).toLocaleDateString()}
                                            </span>
                                        </button>
                                        <div class="ml-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                            <DeleteButton handleDelete={() => removeDraft(w.id)} />
                                        </div>
                                    </article>
                                {/each}
                            </div>
                        {/if}
                    </section>
                {:else}
                    {#each [...today, ...thisWeek, ...older] as w (w.id)}
                        <article 
                            class="group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-all
                            {w.id === currentWriteupId 
                                ? 'bg-white dark:bg-slate-800 dark:ring-slate-800' 
                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-900'}"
                        >
                            <button class="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus:outline-none" onclick={() => openDraft(w.id)}>
                                <span class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {deriveTitle(w.content) || 'Untitled Draft'}
                                </span>
                                <span class="truncate text-xs text-slate-300 group-hover:text-slate-400">
                                    {formatRelative(new Date(w.updatedAt))}
                                </span>
                            </button>
                            <div class="ml-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                <DeleteButton handleDelete={() => removeDraft(w.id)} />
                            </div>
                        </article>
                    {/each}
                {/if}
            </div>
        {:else}
            <div class="text-center text-sm text-slate-400 py-8">
                No drafts yet
            </div>
        {/if}
    </div>
</aside>
