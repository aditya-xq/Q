<script lang="ts">
    import { loadProjects, addProject, deleteProject } from '$lib/utils/stores'
    import { onMount } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import { fade, slide, fly } from 'svelte/transition'
    import { quintOut } from 'svelte/easing'
    import TaskItem from './TaskItem.svelte'
    import AddTaskInput from './AddTaskInput.svelte'
    import { DeleteButton } from '../shared'
    import EmptyTaskView from './EmptyTaskView.svelte'

    let newProjectTitle = $state('')
    let isAddingProject = $state(false)
    let selectedProjectId = $state<number | null>(null)
    let showCompleted = $state(false)

    onMount(() => {
        loadProjects()
        // Auto-select first project if available
        if (appState.projectStore.length > 0) {
            selectedProjectId = appState.projectStore[0].id as number
        }
    })

    async function addNewProject() {
        if (newProjectTitle.trim() !== '') {
            await addProject(newProjectTitle)
            newProjectTitle = ''
            isAddingProject = false
            selectedProjectId = appState.projectStore[0]?.id ?? null
        }
    }

    function startAddingProject() {
        isAddingProject = true
        setTimeout(() => {
            const input = document.getElementById('new-project-input')
            if (input) input.focus()
        }, 50)
    }

    function cancelAddProject() {
        isAddingProject = false
        newProjectTitle = ''
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            cancelAddProject()
        } else if (e.key === 'Enter') {
            addNewProject()
        }
    }

    function onToggleComplete() {
        showCompleted = true
    }

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-84' : '')
    let selectedProject = $derived(appState.projectStore.find(p => p.id === selectedProjectId))
    let activeTasks = $derived(selectedProject?.tasks.filter(t => !t.completed).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || [])
    let completedTasks = $derived(selectedProject?.tasks.filter(t => t.completed).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) || [])
</script>

<div class={`container mx-auto px-8 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="flex gap-6 h-[calc(100vh-8rem)]">
        <!-- Left Sidebar - Project List -->
        <div class="w-86 shrink-0">
            <div class="rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
                <div class="p-4 border-b border-slate-200/70 dark:border-slate-800/70">
                    <h2 class="text-lg font-semibold text-slate-700 dark:text-slate-100">Projects</h2>
                </div>

                <div class="grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div class="p-2 space-y-1">
                        {#each appState.projectStore as project (project.id)}
                            <button
                                class={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                                    selectedProjectId === project.id
                                        ? 'bg-slate-200/80 dark:bg-slate-800/80 shadow-sm ring-1 ring-slate-300/50 dark:ring-slate-700/50'
                                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                                }`}
                                onclick={() => selectedProjectId = project.id as number}
                                transition:fly={{ y: -10, duration: 300, easing: quintOut }}
                            >
                                <div class="flex items-center justify-between">
                                    <div class="grow min-w-0">
                                        <h3 class={`font-medium truncate ${
                                            selectedProjectId === project.id
                                                ? 'text-slate-800 dark:text-slate-100'
                                                : 'text-slate-700 dark:text-slate-200'
                                        }`}>
                                            {project.title}
                                        </h3>
                                        <p class="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                            {project.tasks.length} {project.tasks.length === 1 ? 'task' : 'tasks'}
                                        </p>
                                    </div>
                                    <DeleteButton handleDelete={() => deleteProject(project.id as number)}/>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="p-3 border-t border-slate-200/70 dark:border-slate-800/70">
                    {#if isAddingProject}
                        <div class="space-y-2" transition:slide={{ duration: 200 }}>
                            <input
                                id="new-project-input"
                                type="text"
                                placeholder="Project name"
                                bind:value={newProjectTitle}
                                onkeydown={handleKeydown}
                                class="w-full bg-slate-100/80 dark:bg-slate-800/70 border-0 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-slate-600/40 text-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                            />
                            <div class="flex gap-2">
                                <button
                                    class="flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 font-medium"
                                    onclick={cancelAddProject}
                                >
                                    Cancel
                                </button>
                                <button
                                    class="flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-200 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium shadow-sm"
                                    onclick={addNewProject}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    {:else}
                        <button
                            onclick={startAddingProject}
                            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all duration-200 group"
                        >
                            <div class="w-5 h-5 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">New Project</span>
                        </button>
                    {/if}
                </div>
            </div>
        </div>

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
                                <div class="flex flex-col items-center justify-center py-16">
                                    <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <p class="text-slate-500 dark:text-slate-500 text-center">
                                        No tasks yet. Add your first task below.
                                    </p>
                                </div>
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
                <EmptyTaskView />
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

    .dark .scrollbar-thumb-slate-700::-webkit-scrollbar-thumb {
        background-color: rgb(51 65 85);
    }

    .scrollbar-track-transparent::-webkit-scrollbar-track {
        background: transparent;
    }
</style>
