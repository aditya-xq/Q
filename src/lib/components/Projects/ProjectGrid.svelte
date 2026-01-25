<script lang="ts">
    import { loadProjects } from '$lib/utils/stores'
    import { onMount, onDestroy } from 'svelte'
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

    // Mobile sidebar state
    let mobileMenuOpen = $state(false)
    let isAnimating = $state(false)
    
    function toggleMobileMenu() {
        if (mobileMenuOpen) {
            closeMobileMenu()
        } else {
            openMobileMenu()
        }
    }
    
    function openMobileMenu() {
        mobileMenuOpen = true
        document.body.style.overflow = 'hidden'
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                isAnimating = true
            })
        })
    }
    
    function closeMobileMenu() {
        isAnimating = false
        setTimeout(() => {
            mobileMenuOpen = false
            document.body.style.overflow = ''
        }, 300)
    }
    
    onDestroy(() => {
        document.body.style.overflow = ''
    })
</script>

<div class={`container mx-auto px-3 sm:px-4 md:px-8 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div class="flex gap-4 lg:gap-6 h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] relative">
        <!-- Desktop Left Sidebar - Project List -->
        <div class="hidden md:block">
            <ProjectList {selectedProjectId} {onProjectSelection}/>
        </div>

        <!-- Main Content Area -->
        <div class="grow min-w-0">
            <!-- Mobile Header with Projects Button -->
            <div class="md:hidden flex items-center justify-end mb-3 sm:mb-4">
                <button
                    class="group relative rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow active:scale-95"
                    onclick={toggleMobileMenu}
                    aria-label="Open projects"
                >
                    <div class="flex items-center gap-1.5 sm:gap-2">
                        <span class="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">Projects</span>
                    </div>
                </button>
            </div>

            {#if selectedProject}
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 h-[calc(100vh-12rem)] md:h-full flex flex-col overflow-hidden" transition:fade={{ duration: 200 }}>
                    <!-- Project Header -->
                    <div class="p-4 sm:p-6 border-b border-slate-200/70 dark:border-slate-700">
                        <div class="flex items-center justify-between">
                            <div class="grow min-w-0">
                                <h1 class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 truncate">
                                    {selectedProject.title}
                                </h1>
                                <p class="text-xs sm:text-sm text-slate-500">
                                    {completedTasks.length} of {selectedProject.tasks.length} completed
                                </p>
                            </div>
                        </div>
                    </div>
                    <!-- Task List -->
                    <div class="grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div class="p-4 sm:p-6">
                            {#if selectedProject.tasks.length === 0}
                                <NoTasks />
                            {:else}
                                <div class="space-y-4 sm:space-y-6">
                                    <!-- Active Tasks -->
                                    {#if activeTasks.length > 0}
                                        <div>
                                            <h3 class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 sm:mb-3 px-1">
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
                                                class="w-full flex items-center justify-between px-1 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200"
                                            >
                                                <span>Completed Tasks ({completedTasks.length})</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    class="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 {showCompleted ? 'rotate-180' : ''}"
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
                    <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
                        <AddTaskInput projectId={selectedProject.id as number} />
                    </div>
                </div>
            {:else}
                <NoProjectSelected />
            {/if}
        </div>

        <!-- Mobile Projects Sidebar -->
        {#if mobileMenuOpen}
            <!-- Backdrop -->
            <div
                class="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                class:opacity-0={!isAnimating}
                class:opacity-100={isAnimating}
                onclick={closeMobileMenu}
                onkeydown={closeMobileMenu}
                aria-label="Close projects panel"
                role="button"
                tabindex="-1"
            ></div>
            
            <!-- Sliding panel from right -->
            <div 
                class="md:hidden fixed right-0 top-0 bottom-0 w-84 max-w-[85vw] bg-slate-50 dark:bg-slate-950 z-50 shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out"
                class:translate-x-0={isAnimating}
                class:translate-x-full={!isAnimating}
            >
                <!-- Header with close button -->
                <div class="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-3 sm:py-3.5 flex justify-between items-center z-10">
                    <div class="flex items-center gap-2">
                        <h3 class="text-xs sm:text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase opacity-60">
                            Projects
                        </h3>
                    </div>
                    <button
                        class="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        onclick={closeMobileMenu}
                        aria-label="Close projects panel"
                    >
                        <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Panel content -->
                <div class="px-2 py-3 sm:py-4">
                    <ProjectList 
                        {selectedProjectId} 
                        onProjectSelection={(id: number) => {
                            onProjectSelection(id)
                            closeMobileMenu()
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
