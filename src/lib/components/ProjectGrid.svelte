<script lang="ts">
    import { loadProjects, addProject } from '$lib/utils/stores'
    import { onMount } from 'svelte'
    import ProjectCard from './ProjectCard.svelte'
    import { appState } from '$lib/state.svelte'
    import { fade } from 'svelte/transition'

    let newProjectTitle = $state('')
    let isAddingProject = $state(false)
    let addCardElement: HTMLElement

    onMount(() => {
        loadProjects()
    })

    function addNewProject() {
        if (newProjectTitle.trim() !== '') {
            addProject(newProjectTitle)
            newProjectTitle = ''
            isAddingProject = false
        }
    }

    function startAddingProject() {
        isAddingProject = true
        // Focus the input after it appears
        setTimeout(() => {
            const input = document.getElementById('new-project-input')
            if (input) input.focus()
        }, 50)
    }

    function cancelAddProject() {
        isAddingProject = false
        newProjectTitle = ''
    }

    // Handle escape key to cancel adding
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            cancelAddProject()
        } else if (e.key === 'Enter') {
            addNewProject()
        }
    }

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-84' : '')
</script>

<div class={`container mx-auto px-40 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each appState.projectStore as project (project.id)}
            <div in:fade={{ duration: 200, delay: 50 }}>
                <ProjectCard {project} />
            </div>
        {/each}

        <!-- Add Project Card -->
        <div class="h-64 relative" bind:this={addCardElement}>
            {#if isAddingProject}
                <div
                    class="absolute inset-0 rounded-xl shadow-sm backdrop-blur-sm bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800/50 transition-all duration-200"
                    in:fade={{ duration: 150 }}
                >
                    <div class="p-5 h-full flex flex-col items-center justify-center">
                        <div class="w-full max-w-xs">
                            <input
                                id="new-project-input"
                                type="text"
                                placeholder="Project name"
                                bind:value={newProjectTitle}
                                onkeydown={handleKeydown}
                                class="w-full bg-slate-100/80 dark:bg-slate-800/70 border-0 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 text-center placeholder:text-slate-500 dark:placeholder:text-slate-600 font-medium text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm"
                            />

                            <div class="flex justify-center space-x-3">
                                <button
                                    class="px-4 py-2 rounded-lg text-sm transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 font-medium"
                                    onclick={cancelAddProject}
                                >
                                    Cancel
                                </button>
                                <button
                                    class="px-4 py-2 rounded-lg text-sm transition-all duration-200 bg-gradient-to-r from-indigo-500/90 to-indigo-600/90 dark:from-indigo-700 dark:to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 dark:hover:from-indigo-600 dark:hover:to-indigo-700 text-white font-medium shadow-sm hover:shadow"
                                    onclick={addNewProject}
                                >
                                    Add Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <button
                    onclick={startAddingProject}
                    class="absolute inset-0 flex items-center justify-center rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all duration-200 shadow-sm hover:shadow group"
                    in:fade={{ duration: 150 }}
                >
                    <div class="flex flex-col items-center space-y-2">
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400/90 to-indigo-600/90 dark:from-indigo-600 dark:to-indigo-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-110"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </div>
                        <span
                            class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors duration-200"
                            >New Project</span
                        >
                    </div>
                </button>
            {/if}
        </div>
    </div>
</div>
