<script lang="ts">
    import { clickOutside } from "$lib/utils/utils"
    import { slide } from "svelte/transition"
    let { handleDelete } = $props()
    let showConfirmDelete = $state(false)
</script>
<div class="relative inline-block">
    <button
        class="p-1.5 rounded-full transition-colors text-slate-500 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
        onclick={(e) => {
            e.stopPropagation()
            if (showConfirmDelete) {
                handleDelete()
            } else {
                showConfirmDelete = true
            }
        }}
        aria-label="Delete project"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    </button>
    {#if showConfirmDelete}
        <!-- absolutely positioned popup placed below the button; does not change layout -->
        <div
            use:clickOutside={() => (showConfirmDelete = false)}
            class="absolute top-full -left-30 transform -translate-x-1/2 mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-xs z-50 rounded-lg bg-red-50/95 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 backdrop-blur-sm shadow-lg p-3"
            transition:slide={{ duration: 180 }}
            role="dialog"
            aria-label="Confirm delete"
            aria-modal="false"
        >
            <p class="text-sm text-red-700 dark:text-red-300 mb-2">Are you sure you want to delete this?</p>

            <div class="flex justify-end items-center space-x-2">
                <!-- Improved Cancel button to match delete aesthetic -->
                <button
                    type="button"
                    onclick={(e) => {
                        e.stopPropagation()
                        showConfirmDelete = false
                    }}
                    class="px-3 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-800 bg-transparent text-red-700 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700 transition"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    data-confirm-delete-button
                    onclick={handleDelete}
                    class="px-3 py-1.5 text-xs rounded-lg bg-red-500/95 hover:bg-red-600/95 dark:bg-red-700 dark:hover:bg-red-600 text-white transition"
                >
                    Delete
                </button>
            </div>
        </div>
    {/if}
</div>
