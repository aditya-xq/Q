<script lang="ts">
    import { onMount } from 'svelte'
    import { slide } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'
    import { db } from '$lib/utils/db'
    import type { Task, Project } from '$lib/utils/db'
    import { ensureQuickTodoProject, getSetting, updateSetting } from '$lib/utils/stores'
    import { appState } from '$lib/state.svelte'

    import TaskList from './TaskList.svelte'
    import QuickAddInput from './QuickAddInput.svelte'

    export let listTitle = '✅ Queue'

    let quickInput: any

    const QUICK_TODO_ID = -1
    let tasks: Task[] = []
    let projects: Project[] = []
    let isLoading = true

    function togglePanel() {
        if (appState.projectView) appState.projectView = false
        if (appState.settingsView) appState.settingsView = false
        if (appState.writerView) appState.writerView = false
        appState.isQuickPanelOpen = !appState.isQuickPanelOpen
    }

    function toggleProjectView() {
        if (appState.settingsView) appState.settingsView = false
        if (appState.writerView) appState.writerView = false
        appState.isQuickPanelOpen = false
        appState.projectView = !appState.projectView
    }

    function toggleWriterView() {
        if (appState.settingsView) appState.settingsView = false
        if (appState.projectView) appState.projectView = false
        appState.isQuickPanelOpen = false
        appState.writerView = !appState.writerView
    }

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
        await db.tasks.add({ projectId: QUICK_TODO_ID, text, completed: false, createdAt: new Date() })
        await loadTasks()
    }

    async function toggleComplete(taskId: number, text: string, completed: boolean) {
        await db.tasks.update(taskId, { text, completed: !completed })
        await loadTasks()
    }

    async function removeTask(taskId: number) {
        await db.tasks.delete(taskId)
        await loadTasks()
    }

    onMount(async () => {
        await ensureQuickTodoProject()
        // initialize keepQuickPanelOpen from DB (fallback to false)
        const keep = await getSetting('keepQuickPanelOpen')
        appState.keepQuickPanelOpen = typeof keep === 'boolean' ? keep : false
        await Promise.all([loadTasks(), loadProjects()])
    })

    async function toggleKeepQuickPanelOpen() {
        const newVal = !appState.keepQuickPanelOpen
        await updateSetting('keepQuickPanelOpen', newVal)
        appState.keepQuickPanelOpen = newVal
    }
</script>

<!-- ===== Floating Menu ===== -->
<div class="fixed top-5 left-4 z-[1000] flex flex-col gap-3">
    <!-- Quick Todo -->
    <button
        onclick={togglePanel}
        aria-label="Quick Todo (AltQ)"
        title="Quick Todo (AltQ)"
        class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
           hover:scale-105 active:scale-95
           data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
           data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400"
        data-active={appState.isQuickPanelOpen && !appState.projectView}
    >
        <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110">✅</span>
    </button>

    <!-- Projects -->
    <button
        onclick={toggleProjectView}
        aria-label="Projects (Alt + P)"
        title="Projects (Alt + P)"
        class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
           hover:scale-105 active:scale-95
           data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
           data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400"
        data-active={appState.projectView}
    >
        <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110">📋</span>
    </button>

    <!-- Writer Mode -->
    <button
        onclick={toggleWriterView}
        aria-label="Writer (Alt + W)"
        title="Writer (Alt + W)"
        class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
           hover:scale-105 active:scale-95
           data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
           data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400"
        data-active={appState.writerView}
    >
        <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110">✍️</span>
    </button>
</div>

<!-- ===== Quick Todo Panel ===== -->
{#if appState.keepQuickPanelOpen || appState.isQuickPanelOpen}
    <div
        class="fixed top-0 left-[4.5rem] sm:left-[5rem] h-full w-[18rem] sm:w-[20rem]
           bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700
           shadow-xl rounded-r-2xl flex flex-col overflow-hidden z-[900]"
        in:slide={{ axis: 'x', duration: 300, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 250 }}
        onintroend={() => quickInput?.focus?.()}
    >
        <header class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">{listTitle}</h2>
            <div class="flex items-center gap-2">
                <!-- Enhanced Pin Button -->
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

                {#if !appState.keepQuickPanelOpen}
                    <button
                        onclick={() => (appState.isQuickPanelOpen = false)}
                        class="text-slate-500 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400 transition"
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
