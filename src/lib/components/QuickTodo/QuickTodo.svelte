<script lang="ts">
    import { onMount } from 'svelte'
    import { slide, fade } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'
    import { db, getSetting, setSetting } from '$lib/utils/db'
    import type { Task, Project } from '$lib/utils/db'
    import { ensureQuickTodoProject } from '$lib/utils/stores'
    import { appState, updateView, type View } from '$lib/state.svelte'

    import TaskList from './TaskList.svelte'
    import QuickAddInput from './QuickAddInput.svelte'
    import { Icon } from '../shared'

    let quickInput: any = $state()
    let mobileMenuOpen = $state(false)
    let isMobile = $state(false)

    let listTitle = $derived(`${isMobile ? '📌' : ''} To do`)

    const QUICK_TODO_ID = -1
    let tasks: Task[] = $state([])
    let projects: Project[] = $state([])
    let isLoading = true

    const menuItems = [
        { 
            id: 'projects', 
            label: 'Projects (Alt + P)', 
            icon: '📋',
            view: 'projects'
        },
        { 
            id: 'writer', 
            label: 'Writer (Alt + W)', 
            icon: '✍️',
            view: 'writer'
        },
        {
            id: 'finance',
            label: 'Finance (Alt + M)', 
            icon: '💰',
            view: 'finance'
        },
        { 
            id: 'games', 
            label: 'Games (Alt + G)', 
            icon: '🎮',
            view: 'games'
        }
    ]

    async function loadTasks() {
        isLoading = true
        const allTasks = await db.tasks.where('projectId').equals(QUICK_TODO_ID).toArray()
        tasks = allTasks.sort((a, b) => {
            if (a.completed === b.completed) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            return a.completed ? 1 : -1
        })
        isLoading = false
    }

    async function loadProjects() {
        projects = (await db.projects.toArray()).filter((p) => p.id !== QUICK_TODO_ID)
    }

    async function addNewTask(text: string) {
        if (!text.trim()) return
        await db.tasks.add({ projectId: QUICK_TODO_ID, text, completed: false, createdAt: new Date(), updatedAt: new Date() })
        await loadTasks()
    }

    async function toggleComplete(taskId: number, text: string, completed: boolean) {
        await db.tasks.update(taskId, { text, completed: !completed, updatedAt: new Date() })
        await loadTasks()
    }

    async function removeTask(taskId: number) {
        await db.tasks.delete(taskId)
        await loadTasks()
    }

    function checkMobile() {
        isMobile = window.innerWidth < 768 // md breakpoint
    }

    function handleMobileMenuItemClick(view: View) {
        if (isMobile) {
            mobileMenuOpen = false
            // Small delay to allow menu close animation before view change
            setTimeout(() => updateView(view), 150)
        } else {
            updateView(view)
        }
    }

    function handleQuickTodoClick() {
        if (isMobile) {
            updateView('quick-panel')
            mobileMenuOpen = false
        } else {
            updateView('quick-panel')
        }
    }

    function closeMobileQuickPanel() {
        if (isMobile) {
            updateView('home')
        }
    }

    onMount(() => {
        // Run async initialization
        (async () => {
            await ensureQuickTodoProject()
            // initialize keepQuickPanelOpen from DB (fallback to false)
            const keep = await getSetting('keepQuickPanelOpen')
            appState.keepQuickPanelOpen = typeof keep === 'boolean' ? keep : false
            await Promise.all([loadTasks(), loadProjects()])
        })()
        
        // Check mobile on mount and resize
        checkMobile()
        window.addEventListener('resize', checkMobile)
        
        // Return cleanup function synchronously
        return () => {
            window.removeEventListener('resize', checkMobile)
        }
    })

    async function toggleKeepQuickPanelOpen() {
        const newVal = !appState.keepQuickPanelOpen
        await setSetting('keepQuickPanelOpen', newVal)
        appState.keepQuickPanelOpen = newVal
    }
</script>

<!-- Mobile Menu Toggle Button (only on mobile) -->
{#if isMobile}
    <button
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        aria-label="Toggle Menu"
        class="fixed z-1001 top-3 left-3 rounded-full p-2 
               text-white shadow-lg hover:shadow-xl
               hover:bg-slate-700 active:scale-95 transition-all duration-300"
    >
        <svg class="w-6 h-6 transition-transform duration-300" 
             class:rotate-90={mobileMenuOpen}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            {/if}
        </svg>
    </button>
{/if}

<!-- Mobile Menu Overlay -->
{#if isMobile && mobileMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 bg-black/50 z-999"
        onclick={() => mobileMenuOpen = false}
        transition:fade={{ duration: 200 }}
    ></div>
{/if}

<!-- Desktop Floating Menu / Mobile Slide-out Menu -->
<div 
    class="fixed z-1000 transition-transform duration-300
           {isMobile 
             ? 'top-0 left-0 h-full w-64 bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col py-20 px-4 gap-3 border-r border-slate-200 dark:border-slate-700' 
             : 'top-5 left-4 flex flex-col gap-3'}"
    class:translate-x-0={isMobile && mobileMenuOpen}
    class:-translate-x-full={isMobile && !mobileMenuOpen}
>
    <!-- Quick Todo Button -->
    <button
        onclick={handleQuickTodoClick}
        aria-label="Quick Todo (Alt + Q)"
        class="group rounded-lg border border-slate-200 dark:border-slate-700
        bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
        shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
        hover:scale-105 active:scale-95
        data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
        data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400
        {isMobile ? 'w-full p-4 flex items-center gap-3' : 'p-0'}"
        data-active={appState.view === 'quick-panel'} 
        data-tooltip={isMobile ? null : 'Quick Todo (Alt + Q)'} 
        data-tooltip-position="right"
    >
        <span class="block md:text-sm transition-transform duration-300 {isMobile ? 'text-2xl' : ''}">
            <div class="w-9 h-9"><Icon/></div>
        </span>
        {#if isMobile}
            <span class="text-sm font-medium">Quick Todo</span>
        {/if}
    </button>

    <!-- Menu Items -->
    {#each menuItems as item}
        <button
            onclick={() => handleMobileMenuItemClick(item.view as View)}
            aria-label={item.label}
            class="group rounded-lg border border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
            shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
            hover:scale-105 active:scale-95
            data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
            data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400
            {isMobile ? 'w-full p-4 flex items-center gap-3' : 'p-2'}"
            data-active={appState.view === item.view} 
            data-tooltip={isMobile ? null : item.label} 
            data-tooltip-position="right"
        >
            <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110 {isMobile ? 'text-2xl' : ''}">
                {item.icon}
            </span>
            {#if isMobile}
                <span class="text-sm font-medium">{item.label.split('(')[0].trim()}</span>
            {/if}
        </button>
    {/each}
</div>

<!-- Quick Todo Panel - Desktop Side Panel / Mobile Full Screen -->
{#if (isMobile && appState.view === 'quick-panel') || (!isMobile && (appState.keepQuickPanelOpen || appState.view === 'quick-panel'))}
    <div
        class="fixed z-1002 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700
           flex flex-col overflow-hidden
           {isMobile 
             ? 'inset-0 rounded-none' 
             : 'top-0 left-18 sm:left-20 h-full w-[18rem] sm:w-[20rem] border-r rounded-r-2xl'}"
        in:slide={{ axis: isMobile ? 'y' : 'x', duration: 300, easing: cubicOut }}
        out:slide={{ axis: isMobile ? 'y' : 'x', duration: 250 }}
        onintroend={() => quickInput?.focus?.()}
    >
        <header class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700
                       {isMobile ? 'pt-3' : ''}">
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">{listTitle}</h2>
            <div class="flex items-center gap-2">
                <!-- Pin Button - Desktop Only -->
                {#if !isMobile}
                    <button
                        onclick={toggleKeepQuickPanelOpen}
                        aria-pressed={appState.keepQuickPanelOpen}
                        aria-label={appState.keepQuickPanelOpen ? 'Unpin quick panel' : 'Pin quick panel'}
                        class="pin-button group relative inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200"
                        class:pinned={appState.keepQuickPanelOpen}
                        title={appState.keepQuickPanelOpen ? 'Unpin panel' : 'Pin panel'}
                    >
                        <span class="pin-icon block text-base select-none leading-none">
                            📌
                        </span>
                        <span class="sr-only">{appState.keepQuickPanelOpen ? 'Unpin' : 'Pin'} quick panel</span>
                    </button>
                {/if}

                <!-- Close Button -->
                {#if isMobile || !appState.keepQuickPanelOpen}
                    <button
                        onclick={() => isMobile ? closeMobileQuickPanel() : updateView('home')}
                        class="text-slate-500 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400 transition
                               {isMobile ? 'text-xl p-1' : ''}"
                        aria-label="Close Panel"
                    >
                        ✕
                    </button>
                {/if}
            </div>
        </header>

        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <QuickAddInput bind:this={quickInput} onAddTask={addNewTask} />
        </div>

        <div class="flex-1 overflow-y-auto px-3 pb-4">
            <TaskList {tasks} onToggleComplete={toggleComplete} onRemoveTask={removeTask} />
        </div>
    </div>
{/if}

<style>
    /* Pin Button Base Styles */
    .pin-button {
        border: 1px solid rgb(226 232 240); /* slate-200 */
        background: rgb(248 250 252); /* slate-50 */
    }
    
    :global(.dark) .pin-button {
        border-color: rgb(51 65 85); /* slate-700 */
        background: rgb(15 23 42 / 0.5); /* slate-950 with transparency */
    }

    /* Unpinned State - Hover */
    .pin-button:not(.pinned):hover {
        border-color: rgb(148 163 184); /* slate-400 */
        background: white;
        transform: scale(1.05);
    }

    :global(.dark) .pin-button:not(.pinned):hover {
        border-color: rgb(100 116 139); /* slate-500 */
        background: rgb(30 41 59); /* slate-800 */
    }

    /* Pinned State */
    .pin-button.pinned {
        border-color: rgb(203 213 225); /* slate-300 */
        background: rgb(241 245 249); /* slate-100 */
    }

    :global(.dark) .pin-button.pinned {
        border-color: rgb(71 85 105); /* slate-600 */
        background: rgb(30 41 59 / 0.5); /* slate-800 with transparency */
    }

    /* Pinned State - Hover */
    .pin-button.pinned:hover {
        border-color: rgb(148 163 184); /* slate-400 */
        background: rgb(226 232 240); /* slate-200 */
        transform: scale(1.03);
    }

    :global(.dark) .pin-button.pinned:hover {
        border-color: rgb(100 116 139); /* slate-500 */
        background: rgb(51 65 85 / 0.6); /* slate-700 */
    }

    /* Active State */
    .pin-button:active {
        transform: scale(0.95);
    }

    /* Pin Icon Animation */
    .pin-icon {
        transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08));
    }

    /* Unpinned: subtle upward tilt */
    .pin-button:not(.pinned) .pin-icon {
        transform: translateY(0) rotate(0deg);
    }

    .pin-button:not(.pinned):hover .pin-icon {
        transform: translateY(-1px) rotate(-8deg);
    }

    /* Pinned: pushed in and tilted */
    .pin-button.pinned .pin-icon {
        transform: translateY(-3px) rotate(-30deg);
    }

    .pin-button.pinned:hover .pin-icon {
        transform: translateY(-3.5px) rotate(-32deg);
    }
</style>
