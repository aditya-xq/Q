<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { formatRelative, isThisWeek, isToday } from '$lib/utils/datetime'
    import { DeleteButton } from '../shared'
    import { slide } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'

    let { createNewDraft, currentWriteupId, openDraft, removeDraft } = $props()

    // --- Derived State ---
    let writeups = $derived(appState.writeups || [])

    let today = $derived(writeups.filter((w) => isToday(new Date(w.updatedAt))))

    // Exclude today's items from "This Week"
    let thisWeek = $derived(
        writeups.filter((w) => !isToday(new Date(w.updatedAt)) && isThisWeek(new Date(w.updatedAt)))
    )

    // Everything else
    let older = $derived(writeups.filter((w) => !isThisWeek(new Date(w.updatedAt))))

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

<aside class="w-72 max-w-full xl:w-80">
    <div class="hidden lg:flex mb-4 items-center justify-between">
        <h3 class="text-sm font-semibold tracking-wide text-fg-muted uppercase">Drafts</h3>
        <!-- New draft button -->
        <button
            class="group min-h-10 rounded-lg px-3 py-2 bg-surface border border-line hover:border-line-strong transition-all shadow-sm hover:shadow"
            onclick={createNewDraft}
            onkeydown={handleKeyCreate}
            aria-label="Create new draft"
        >
            <div class="flex items-center gap-1.5">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-fg-muted group-hover:text-fg transition-all group-hover:rotate-90"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span class="text-xs font-medium text-fg-muted group-hover:text-fg">New</span>
            </div>
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
                                ? 'bg-surface ring-1 ring-line-strong'
                                : 'hover:bg-surface-2/60'}"
                        >
                            <button
                                class="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus:outline-none"
                                onclick={() => openDraft(w.id)}
                            >
                                <span class="truncate text-sm font-medium text-fg">
                                    {w.title}
                                </span>
                                <span class="truncate text-xs text-fg-muted group-hover:text-fg">
                                    {formatRelative(new Date(w.updatedAt))}
                                </span>
                            </button>
                            <div
                                class="ml-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
                            >
                                <DeleteButton label="draft" handleDelete={() => removeDraft(w.id)} />
                            </div>
                        </article>
                    {/each}
                    <section>
                        <button
                            class="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                            onclick={() => (openOlder = !openOlder)}
                        >
                            <span>Older</span>
                            <div class="flex items-center gap-1">
                                <span class="rounded bg-surface-2 px-1.5 py-0.5 text-[10px]">{older.length}</span>
                                <svg
                                    class="h-3 w-3 transform transition-transform duration-200 {openOlder
                                        ? 'rotate-90'
                                        : ''}"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </div>
                        </button>
                        {#if openOlder}
                            <div class="mt-1 space-y-1" transition:slide={{ duration: 200, easing: cubicOut }}>
                                {#each older as w (w.id)}
                                    <article
                                        class="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors
                                        {w.id === currentWriteupId ? 'bg-surface-2' : 'hover:bg-surface-2'}"
                                    >
                                        <button
                                            class="flex min-w-0 flex-1 flex-col text-left focus:outline-none"
                                            onclick={() => openDraft(w.id)}
                                        >
                                            <span
                                                class="truncate text-sm text-fg-muted {w.id === currentWriteupId
                                                    ? 'font-medium text-fg'
                                                    : ''}"
                                            >
                                                {w.title}
                                            </span>
                                            <span class="truncate text-[10px] text-fg-subtle">
                                                {new Date(w.updatedAt).toLocaleDateString()}
                                            </span>
                                        </button>
                                        <div
                                            class="ml-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
                                        >
                                            <DeleteButton label="draft" handleDelete={() => removeDraft(w.id)} />
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
                                ? 'bg-surface ring-1 ring-line-strong'
                                : 'hover:bg-surface-2/60'}"
                        >
                            <button
                                class="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus:outline-none"
                                onclick={() => openDraft(w.id)}
                            >
                                <span class="truncate text-sm font-medium text-fg">
                                    {w.title}
                                </span>
                                <span class="truncate text-xs text-fg-muted group-hover:text-fg">
                                    {formatRelative(new Date(w.updatedAt))}
                                </span>
                            </button>
                            <div
                                class="ml-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"
                            >
                                <DeleteButton label="draft" handleDelete={() => removeDraft(w.id)} />
                            </div>
                        </article>
                    {/each}
                {/if}
            </div>
        {:else}
            <div class="flex flex-col items-center px-3 py-8 text-center">
                <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2/60">
                    <svg
                        class="h-5 w-5 text-fg-subtle"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                    </svg>
                </div>
                <p class="text-sm font-medium text-fg">No drafts yet</p>
                <p class="mt-1 text-xs text-fg-muted">Drafts save automatically as you type.</p>
            </div>
        {/if}
    </div>
</aside>
