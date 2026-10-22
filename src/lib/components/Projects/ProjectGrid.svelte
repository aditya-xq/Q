<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { createMobileDrawer } from '$lib/utils/mobileDrawer.svelte'
    import { deleteCompletedTasks } from '$lib/utils/stores'
    import { toast } from '$lib/utils/notification'
    import { clickOutside } from '$lib/utils/utils'
    import { fade, slide, fly } from 'svelte/transition'
    import { quintOut } from 'svelte/easing'
    import TaskItem from './TaskItem.svelte'
    import AddTaskInput from './AddTaskInput.svelte'
    import NoTasks from './NoTasks.svelte'
    import NoProjectSelected from './NoProjectSelected.svelte'
    import ProjectList from './ProjectList.svelte'

    let selectedProjectId = $state<number | null>(null)
    let showCompleted = $state(false)
    let confirmingClear = $state(false)
    let clearing = $state(false)
    // Tracks ids seen in the store so a freshly created (not-yet-observed) project
    // is not mistaken for a deleted one.
    let knownProjectIds = new Set<number>()

    // Auto-select the first project once loaded, and recover if the current one is deleted.
    $effect(() => {
        const currentIds = new Set(appState.projectStore.map((project) => project.id as number))
        if (selectedProjectId === null) {
            if (appState.projectStore.length > 0) {
                selectedProjectId = appState.projectStore[0].id as number
            }
        } else if (!currentIds.has(selectedProjectId) && knownProjectIds.has(selectedProjectId)) {
            selectedProjectId = appState.projectStore[0]?.id ?? null
        }
        knownProjectIds = currentIds
    })

    function onToggleComplete() {
        showCompleted = true
    }

    function onProjectSelection(id: number) {
        selectedProjectId = id
        confirmingClear = false
    }

    async function clearCompletedTasks() {
        if (!selectedProject || clearing) return
        clearing = true
        try {
            const removed = await deleteCompletedTasks(selectedProject.id as number)
            confirmingClear = false
            if (removed > 0) {
                toast.success(removed === 1 ? 'Deleted 1 completed task' : `Deleted ${removed} completed tasks`)
            }
        } catch {
            toast.error('Could not delete completed tasks')
        } finally {
            clearing = false
        }
    }

    let selectedProject = $derived(appState.projectStore.find((p) => p.id === selectedProjectId))
    let activeTasks = $derived(
        selectedProject?.tasks
            .filter((t) => !t.completed)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || []
    )
    let completedTasks = $derived(
        selectedProject?.tasks
            .filter((t) => t.completed)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || []
    )

    // Mobile sidebar state
    const drawer = createMobileDrawer()
</script>

<div class="container mx-auto px-3 sm:px-4 md:px-8 transition-all duration-300 ease-in-out">
    <div class="flex gap-4 lg:gap-6 h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] relative">
        <!-- Desktop Left Sidebar - Project List -->
        <div class="hidden md:block">
            <ProjectList {selectedProjectId} {onProjectSelection} />
        </div>

        <!-- Main Content Area -->
        <div class="grow min-w-0">
            <!-- Mobile Header with Projects Button -->
            <div class="md:hidden flex items-center justify-end mb-3 sm:mb-4">
                <button
                    class="group relative rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow active:scale-95"
                    onclick={drawer.toggleDrawer}
                    aria-label="Open projects"
                >
                    <div class="flex items-center gap-1.5 sm:gap-2">
                        <span
                            class="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                            >Projects</span
                        >
                    </div>
                </button>
            </div>

            {#if selectedProject}
                <div
                    class="rounded-lg border border-slate-200 dark:border-slate-700 h-[calc(100vh-12rem)] md:h-full flex flex-col overflow-hidden"
                    transition:fade={{ duration: 200 }}
                >
                    <!-- Project Header -->
                    <div class="p-4 sm:p-6 border-b border-slate-200/70 dark:border-slate-700">
                        <div class="flex items-center justify-between">
                            <div class="grow min-w-0">
                                <h1
                                    class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 truncate"
                                >
                                    {selectedProject.title}
                                </h1>
                                <p class="text-xs sm:text-sm text-slate-500">
                                    {completedTasks.length} of {selectedProject.tasks.length} completed
                                </p>
                            </div>
                        </div>
                    </div>
                    <!-- Task List -->
                    <div
                        class="grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
                    >
                        <div class="p-4 sm:p-6">
                            {#if selectedProject.tasks.length === 0}
                                <NoTasks />
                            {:else}
                                <div class="space-y-4 sm:space-y-6">
                                    <!-- Active Tasks -->
                                    {#if activeTasks.length > 0}
                                        <div>
                                            <h3
                                                class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 sm:mb-3 px-1"
                                            >
                                                Active Tasks
                                            </h3>
                                            <div class="space-y-2">
                                                {#each activeTasks as task (task.id)}
                                                    <div transition:slide={{ duration: 300, easing: quintOut }}>
                                                        <TaskItem {task} {onToggleComplete} />
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- Completed Tasks Accordion -->
                                    {#if completedTasks.length > 0}
                                        <div class="pt-2">
                                            <div use:clickOutside={() => (confirmingClear = false)}>
                                                <div class="flex items-center gap-1.5 pr-2 sm:pr-3">
                                                    <button
                                                        onclick={() => (showCompleted = !showCompleted)}
                                                        aria-expanded={showCompleted}
                                                        class="grow min-w-0 flex items-center justify-between px-1 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200"
                                                    >
                                                        <span>Completed Tasks ({completedTasks.length})</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            class="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 {showCompleted
                                                                ? 'rotate-180'
                                                                : ''}"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() => (confirmingClear = !confirmingClear)}
                                                        aria-label="Delete all completed tasks"
                                                        aria-expanded={confirmingClear}
                                                        title="Delete all completed tasks"
                                                        class={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-1.5 text-[0.65rem] sm:text-xs font-medium transition-all duration-200 active:scale-95 ${
                                                            confirmingClear
                                                                ? 'border-red-300 bg-red-50/80 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
                                                                : 'border-slate-200/70 bg-white/60 text-slate-500 hover:border-red-200 hover:text-red-500 dark:border-slate-700/70 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-red-900/60 dark:hover:text-red-400'
                                                        }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            class="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                        <span class="hidden lg:inline">Clear</span>
                                                    </button>
                                                </div>

                                                {#if confirmingClear}
                                                    <div
                                                        class="mt-2 mr-2 sm:mr-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30"
                                                        transition:slide={{ duration: 180 }}
                                                        role="group"
                                                        aria-label="Confirm deleting completed tasks"
                                                    >
                                                        <p class="text-xs text-red-700 dark:text-red-300">
                                                            Delete {completedTasks.length}
                                                            {completedTasks.length === 1
                                                                ? 'completed task'
                                                                : 'completed tasks'}?
                                                        </p>
                                                        <div class="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onclick={() => (confirmingClear = false)}
                                                                class="rounded-lg border border-red-200 px-2.5 py-2 sm:py-1 text-[0.7rem] text-red-700 transition hover:bg-red-100/70 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onclick={clearCompletedTasks}
                                                                disabled={clearing}
                                                                class="rounded-lg bg-red-500/95 px-2.5 py-2 sm:py-1 text-[0.7rem] text-white transition hover:bg-red-600/95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
                                                            >
                                                                Delete all
                                                            </button>
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>

                                            {#if showCompleted}
                                                <div
                                                    class="space-y-2 mt-2"
                                                    transition:slide={{ duration: 300, easing: quintOut }}
                                                >
                                                    {#each completedTasks as task (task.id)}
                                                        <div
                                                            in:fly={{
                                                                y: -20,
                                                                duration: 400,
                                                                delay: 200,
                                                                easing: quintOut,
                                                            }}
                                                            out:slide={{ duration: 300, easing: quintOut }}
                                                        >
                                                            <TaskItem {task} {onToggleComplete} />
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
                        <AddTaskInput projectId={selectedProject.id as number} />
                    </div>
                </div>
            {:else}
                <NoProjectSelected />
            {/if}
        </div>

        <!-- Mobile Projects Sidebar -->
        {#if drawer.open}
            <!-- Backdrop -->
            <div
                class="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                class:opacity-0={!drawer.animating}
                class:opacity-100={drawer.animating}
                onclick={drawer.closeDrawer}
                onkeydown={drawer.closeDrawer}
                aria-label="Close projects panel"
                role="button"
                tabindex="-1"
            ></div>

            <!-- Sliding panel from right -->
            <div
                class="md:hidden fixed right-0 top-0 bottom-0 w-84 max-w-[85vw] bg-slate-50 dark:bg-slate-950 z-50 shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out"
                class:translate-x-0={drawer.animating}
                class:translate-x-full={!drawer.animating}
            >
                <!-- Header with close button -->
                <div
                    class="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-3 sm:py-3.5 flex justify-between items-center z-10"
                >
                    <div class="flex items-center gap-2">
                        <h3
                            class="text-xs sm:text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase opacity-60"
                        >
                            Projects
                        </h3>
                    </div>
                    <button
                        class="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        onclick={drawer.closeDrawer}
                        aria-label="Close projects panel"
                    >
                        <svg
                            class="w-5 h-5 text-slate-500 dark:text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Panel content -->
                <div class="px-2 py-3 sm:py-4">
                    <ProjectList
                        {selectedProjectId}
                        onProjectSelection={(id: number) => {
                            onProjectSelection(id)
                            drawer.closeDrawer()
                        }}
                    />
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .scrollbar-thin::-webkit-scrollbar {
        width: 4px;
    }

    .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb {
        background-color: rgb(203 213 225);
        border-radius: 2px;
    }

    .scrollbar-track-transparent::-webkit-scrollbar-track {
        background: transparent;
    }
</style>
