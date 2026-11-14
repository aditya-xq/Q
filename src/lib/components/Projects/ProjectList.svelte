<script lang="ts">
    import { tick } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import { addProject, deleteProject, updateProject, type ProjectWithTasks } from '$lib/utils/stores'
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
    let newProjectInput = $state<HTMLInputElement | undefined>(undefined)
    let editingProjectId = $state<number | null>(null)
    let renameTitle = $state('')
    let renameInput = $state<HTMLInputElement | undefined>(undefined)
    let renameActions = $state<HTMLElement | undefined>(undefined)

    async function addNewProject() {
        if (newProjectTitle.trim() === '') return
        const id = await addProject(newProjectTitle)
        if (id === undefined) return
        newProjectTitle = ''
        isAddingProject = false
        onProjectSelection(id)
    }

    function startAddingProject() {
        isAddingProject = true
        void tick().then(() => newProjectInput?.focus())
    }

    function cancelAddProject() {
        isAddingProject = false
        newProjectTitle = ''
    }

    function startRename(project: ProjectWithTasks) {
        if (project.id == null) return
        editingProjectId = project.id
        renameTitle = project.title
        void tick().then(() => {
            renameInput?.focus()
            renameInput?.select()
        })
    }

    function cancelRename() {
        editingProjectId = null
    }

    async function commitRename() {
        const id = editingProjectId
        if (id == null) return
        const project = appState.projectStore.find((item) => item.id === id)
        const title = renameTitle.trim()
        editingProjectId = null
        if (!project || !title || title === project.title) return
        await updateProject(id, title)
    }

    function onRenameBlur(event: FocusEvent) {
        const next = event.relatedTarget as Node | null
        if (next && renameActions?.contains(next)) return
        void commitRename()
    }

    function onRenameKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault()
            void commitRename()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            cancelRename()
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
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
                        {#if editingProjectId === project.id}
                            <div class="px-3 sm:px-4 py-2.5 sm:py-3">
                                <input
                                    bind:this={renameInput}
                                    type="text"
                                    bind:value={renameTitle}
                                    aria-label={`Rename ${project.title}`}
                                    onblur={onRenameBlur}
                                    onkeydown={onRenameKeydown}
                                    class="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
                                />
                                <div bind:this={renameActions} class="mt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        class="rounded-md px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                                        onmousedown={(event) => event.preventDefault()}
                                        onclick={cancelRename}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        class="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong"
                                        onmousedown={(event) => event.preventDefault()}
                                        onclick={() => void commitRename()}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <button
                                type="button"
                                aria-current={selectedProjectId === project.id ? 'true' : undefined}
                                class="block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg cursor-pointer"
                                onclick={() => onProjectSelection(project.id as number)}
                            >
                                <div class="pr-16">
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
                            <div
                                class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                            >
                                <button
                                    type="button"
                                    class="p-1.5 rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-accent-text"
                                    aria-label={`Rename ${project.title}`}
                                    title="Rename project"
                                    onclick={() => startRename(project)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
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
                                </button>
                                <DeleteButton
                                    label="project"
                                    handleDelete={() => deleteProject(project.id as number)}
                                />
                            </div>
                        {/if}
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
                        bind:this={newProjectInput}
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
