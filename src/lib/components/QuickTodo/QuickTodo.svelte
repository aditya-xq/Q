<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { slide } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'
    import { db } from '$lib/utils/db'
    import type { Task, Project } from '$lib/utils/db'
    import { ensureQuickTodoProject } from '$lib/utils/stores'
    import { appState } from '$lib/state.svelte'

    import TaskList from './TaskList.svelte'
    import QuickAddInput from './QuickAddInput.svelte'

    export let listTitle = '✅ Queue'

    const QUICK_TODO_ID = -1
    let isPanelOpen = false
    let tasks: Task[] = []
    let projects: Project[] = []
    let isLoading = true

    function togglePanel() {
        if (appState.projectView) appState.projectView = false
        if (appState.settingsView) appState.settingsView = false
        isPanelOpen = !isPanelOpen
    }

    function toggleProjectView() {
        if (appState.settingsView) appState.settingsView = false
        isPanelOpen = false
        appState.projectView = !appState.projectView
    }

    function toggleSettingsView() {
        if (appState.projectView) appState.projectView = false
        isPanelOpen = false
        appState.settingsView = !appState.settingsView
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
        await Promise.all([loadTasks(), loadProjects()])

        const handleKey = (e: KeyboardEvent) => {
            // Ctrl+ shortcuts
            if (e.altKey && e.key.toLowerCase() === 'q') togglePanel()
            else if (e.altKey && e.key.toLowerCase() === 'p') toggleProjectView()
            else if (e.altKey && e.key.toLowerCase() === 's') toggleSettingsView()
        }

        window.addEventListener('keydown', handleKey)
        onDestroy(() => window.removeEventListener('keydown', handleKey))
    })
</script>

<!-- ===== Floating Menu ===== -->
<div class="fixed top-5 left-4 z-[1000] flex flex-col gap-3">
    <!-- Quick Todo -->
    <button
        onclick={togglePanel}
        aria-label="Quick Todo (Alt+Q)"
        title="Quick Todo (Alt+Q)"
        class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
           hover:scale-105 active:scale-95
           data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
           data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400"
        data-active={isPanelOpen && !appState.projectView}
    >
        <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110">✅</span>
    </button>

    <!-- Projects -->
    <button
        onclick={toggleProjectView}
        aria-label="Projects (Alt+P)"
        title="Projects (Alt+P)"
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

    <!-- Settings -->
    <button
        onclick={toggleSettingsView}
        aria-label="Settings (Alt+S)"
        title="Settings (Alt+S)"
        class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
           hover:scale-105 active:scale-95
           data-[active=true]:bg-sky-100 dark:data-[active=true]:bg-sky-900/30
           data-[active=true]:border-sky-400 data-[active=true]:text-sky-600 dark:data-[active=true]:text-sky-400"
        data-active={appState.settingsView}
    >
        <span class="block md:text-sm transition-transform duration-300 group-hover:scale-110">⚙️</span>
    </button>
</div>

<!-- ===== Quick Todo Panel ===== -->
{#if isPanelOpen}
    <div
        class="fixed top-0 left-[4.5rem] sm:left-[5rem] h-full w-[18rem] sm:w-[20rem]
           bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700
           shadow-xl rounded-r-2xl flex flex-col overflow-hidden z-[900]"
        in:slide={{ axis: 'x', duration: 300, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 250 }}
    >
        <header class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">{listTitle}</h2>
            <button
                onclick={() => (isPanelOpen = false)}
                class="text-slate-500 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400 transition"
                aria-label="Close Panel"
            >
                ✕
            </button>
        </header>

        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <QuickAddInput onAddTask={addNewTask} />
        </div>

        <div class="flex-1 overflow-y-auto px-3 pb-4">
            <TaskList {tasks} onToggleComplete={toggleComplete} onRemoveTask={removeTask} />
        </div>
    </div>
{/if}
