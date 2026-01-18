<script lang="ts">
    import { loadProjects } from '$lib/utils/stores'
    import { onMount } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import { fade, slide, fly } from 'svelte/transition'
    import { quintOut } from 'svelte/easing'
    import TaskItem from './TaskItem.svelte'
    import AddTaskInput from './AddTaskInput.svelte'
    import NoTasks from './NoTasks.svelte'
    import NoProjectSelected from './NoProjectSelected.svelte'
    import ProjectList from './ProjectList.svelte'

    let selectedProjectId = $state<number | null>(null)
    let showCompleted = $state(false)

    onMount(() => {
        loadProjects()
        // Auto-select first project if available
        if (appState.projectStore.length > 0) {
            selectedProjectId = appState.projectStore[0].id as number
        }
    })

    function onToggleComplete() {
        showCompleted = true
    }

    function onProjectSelection(id: number) {
        selectedProjectId = id
    }

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-84' : '')
    let selectedProject = $derived(appState.projectStore.find(p => p.id === selectedProjectId))
    let activeTasks = $derived(selectedProject?.tasks.filter(t => !t.completed).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || [])
    let completedTasks = $derived(selectedProject?.tasks.filter(t => t.completed).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || [])
</script>

<div class={`container mx-auto px-8 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="flex gap-6 h-[calc(100vh-8rem)]">
        <!-- Left Sidebar - Project List -->
        <ProjectList {selectedProjectId} {onProjectSelection}/>
        <!-- Right Side - Project Details -->
        <div class="grow">
            {#if selectedProject}
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden" transition:fade={{ duration: 200 }}>
                    <!-- Project Header -->
                    <div class="p-6 border-b border-slate-200/70 dark:border-slate-700">
                        <div class="flex items-center justify-between">
                            <div class="grow">
                                <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                                    {selectedProject.title}
                                </h1>
                                <p class="text-sm text-slate-500">
                                    {completedTasks.length} of {selectedProject.tasks.length} completed
                                </p>
                            </div>
                        </div>
                    </div>
                    <!-- Task List -->
                    <div class="grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div class="p-6">
                            {#if selectedProject.tasks.length === 0}
                                <NoTasks />
                            {:else}
                                <div class="space-y-6">
                                    <!-- Active Tasks -->
                                    {#if activeTasks.length > 0}
                                        <div>
                                            <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 px-1">
                                                Active Tasks
                                            </h3>
                                            <div class="space-y-2">
                                                {#each activeTasks as task (task.id)}
                                                    <div transition:slide={{ duration: 300, easing: quintOut }}>
                                                        <TaskItem {task} {onToggleComplete}/>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- Completed Tasks Accordion -->
                                    {#if completedTasks.length > 0}
                                        <div class="pt-2">
                                            <button
                                                onclick={() => showCompleted = !showCompleted}
                                                class="w-full flex items-center justify-between px-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200"
                                            >
                                                <span>Completed Tasks ({completedTasks.length})</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    class="h-4 w-4 transition-transform duration-300 {showCompleted ? 'rotate-180' : ''}"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            
                                            {#if showCompleted}
                                                <div class="space-y-2 mt-2" transition:slide={{ duration: 300, easing: quintOut }}>
                                                    {#each completedTasks as task (task.id)}
                                                        <div 
                                                            in:fly={{ y: -20, duration: 400, delay: 200, easing: quintOut }}
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
                    <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                        <AddTaskInput projectId={selectedProject.id as number} />
                    </div>
                </div>
            {:else}
                <NoProjectSelected />
            {/if}
        </div>
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
