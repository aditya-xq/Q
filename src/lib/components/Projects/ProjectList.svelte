<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { addProject, deleteProject } from '$lib/utils/stores'
    import { quintOut } from 'svelte/easing'
    import { fly, slide } from 'svelte/transition'
    import { DeleteButton } from '../shared'

    let {
        selectedProjectId,
        onProjectSelection,
    }: {
        selectedProjectId: number | null
        onProjectSelection: (id: number) => void
    } = $props()

    let newProjectTitle = $state('')
    let isAddingProject = $state(false)

    async function addNewProject() {
        if (newProjectTitle.trim() !== '') {
            const id = await addProject(newProjectTitle)
            newProjectTitle = ''
            isAddingProject = false
            onProjectSelection(id)
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
<div class="w-full md:w-86 md:h-full md:shrink-0">
    <div class="md:rounded-xl md:border md:border-line md:bg-surface/40 h-full flex flex-col overflow-hidden">
        <!-- Desktop-only header -->
        <div class="hidden md:block p-4 border-b border-line/70">
            <h2 class="text-lg font-semibold text-fg">Projects</h2>
        </div>

        <!-- Projects list -->
        <div class="grow overflow-y-auto">
            <div class="p-1.5 sm:p-2 space-y-1">
                {#each appState.projectStore as project (project.id)}
                    <div
                        class={`group relative rounded-lg transition-all duration-200 ${
                            selectedProjectId === project.id
                                ? 'bg-surface-2 shadow-sm ring-1 ring-line-strong'
                                : 'hover:bg-surface-2/70'
                        }`}
                        transition:fly={{ y: -10, duration: 300, easing: quintOut }}
                    >
                        <button
                            type="button"
                            aria-current={selectedProjectId === project.id ? 'true' : undefined}
                            class="block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg cursor-pointer"
                            onclick={() => onProjectSelection(project.id as number)}
                        >
                            <div class="pr-9">
                                <h3
                                    class={`font-medium text-sm sm:text-base truncate ${
                                        selectedProjectId === project.id ? 'text-fg' : 'text-fg-muted'
                                    }`}
                                >
                                    {project.title}
                                </h3>
                                <p class="text-xs text-fg-subtle mt-0.5">
                                    {project.tasks.length}
                                    {project.tasks.length === 1 ? 'task' : 'tasks'}
                                </p>
                            </div>
                        </button>
                        <div class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2">
                            <DeleteButton label="project" handleDelete={() => deleteProject(project.id as number)} />
                        </div>
                    </div>
                {/each}
                {#if appState.projectStore.length === 0}
                    <p class="px-3 py-8 text-center text-xs text-fg-subtle">No projects yet. Create one below.</p>
                {/if}
            </div>
        </div>

        <!-- Add project section -->
        <div class="p-2.5 sm:p-3 border-t border-line/70">
            {#if isAddingProject}
                <div class="space-y-2" transition:slide={{ duration: 200 }}>
                    <input
                        id="new-project-input"
                        type="text"
                        placeholder="Project name"
                        aria-label="Project name"
                        bind:value={newProjectTitle}
                        onkeydown={handleKeydown}
                        class="w-full rounded-lg border-0 bg-surface-2 px-3 py-2 text-sm font-medium text-fg shadow-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <div class="flex gap-2">
                        <button
                            class="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-fg-muted transition-all duration-200 hover:bg-surface-2 hover:text-fg active:scale-95"
                            onclick={cancelAddProject}
                        >
                            Cancel
                        </button>
                        <button
                            class="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-fg shadow-sm transition-all duration-200 hover:bg-accent-strong active:scale-95"
                            onclick={addNewProject}
                        >
                            Add
                        </button>
                    </div>
                </div>
            {:else}
                <button
                    onclick={startAddingProject}
                    class="group flex w-full items-center justify-center gap-2 rounded-lg border border-line/70 bg-surface-2/50 px-3 py-2 text-fg-muted transition-all duration-200 hover:bg-surface-2 hover:text-fg active:scale-95 sm:px-4 sm:py-2.5"
                >
                    <div
                        class="flex h-4 w-4 items-center justify-center rounded-full bg-accent transition-transform duration-200 group-hover:scale-110 sm:h-5 sm:w-5"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-2.5 w-2.5 text-accent-fg sm:h-3 sm:w-3"
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
                    <span class="text-xs font-medium sm:text-sm">New Project</span>
                </button>
            {/if}
        </div>
    </div>
</div>
