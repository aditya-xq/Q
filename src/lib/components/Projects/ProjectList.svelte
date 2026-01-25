<script lang="ts">
    import { appState } from "$lib/state.svelte"
    import { addProject, deleteProject } from "$lib/utils/stores"
    import { quintOut } from "svelte/easing"
    import { fly, slide } from "svelte/transition"
    import { DeleteButton } from "../shared"

    let { selectedProjectId, onProjectSelection } = $props()

    let newProjectTitle = $state('')
    let isAddingProject = $state(false)

    async function addNewProject() {
        if (newProjectTitle.trim() !== '') {
            await addProject(newProjectTitle)
            newProjectTitle = ''
            isAddingProject = false
            selectedProjectId = appState.projectStore[0]?.id ?? null
            onProjectSelection(selectedProjectId)
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
</script>

<!-- Mobile: Full width without border, Desktop: Fixed width with border -->
<div class="w-full md:w-86 md:shrink-0">
    <div class="md:rounded-lg md:border md:border-slate-200 md:dark:border-slate-700 h-full flex flex-col overflow-hidden">
        <!-- Desktop-only header -->
        <div class="hidden md:block p-4 border-b border-slate-200/70 dark:border-slate-800/70">
            <h2 class="text-lg font-semibold text-slate-700 dark:text-slate-100">Projects</h2>
        </div>

        <!-- Projects list -->
        <div class="grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div class="p-1.5 sm:p-2 space-y-1">
                {#each appState.projectStore as project (project.id)}
                    <button
                        class={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-200 group relative ${
                            selectedProjectId === project.id
                                ? 'bg-slate-200/80 dark:bg-slate-800/80 shadow-sm ring-1 ring-slate-300/50 dark:ring-slate-700/50'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                        }`}
                        onclick={() => onProjectSelection(project.id as number)}
                        transition:fly={{ y: -10, duration: 300, easing: quintOut }}
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div class="grow min-w-0">
                                <h3 class={`font-medium text-sm sm:text-base truncate ${
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
                            <div class="shrink-0">
                                <DeleteButton handleDelete={(e: { stopPropagation: () => void }) => {
                                    e.stopPropagation()
                                    deleteProject(project.id as number)
                                }}/>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Add project section -->
        <div class="p-2.5 sm:p-3 border-t border-slate-200/70 dark:border-slate-800/70">
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
                            class="flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 font-medium active:scale-95"
                            onclick={cancelAddProject}
                        >
                            Cancel
                        </button>
                        <button
                            class="flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-200 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium shadow-sm active:scale-95"
                            onclick={addNewProject}
                        >
                            Add
                        </button>
                    </div>
                </div>
            {:else}
                <button
                    onclick={startAddingProject}
                    class="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all duration-200 group active:scale-95"
                >
                    <div class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <span class="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">New Project</span>
                </button>
            {/if}
        </div>
    </div>
</div>

<style>
    .dark .scrollbar-thumb-slate-700::-webkit-scrollbar-thumb {
        background-color: rgb(51 65 85);
    }
</style>
