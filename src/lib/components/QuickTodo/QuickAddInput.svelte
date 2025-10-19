<script lang="ts">
    import { onMount } from 'svelte'

    export let onAddTask: (text: string) => void
    export let autoFocus: boolean = false

    let inputEl: HTMLInputElement

    export function focus() {
        inputEl?.focus()
        // select text if you want
        inputEl?.select()
    }

    onMount(() => {
        if (autoFocus) focus()
    })

    let newTaskText = ''

    function handleAddTask() {
        if (newTaskText.trim() !== '') {
            onAddTask(newTaskText)
            newTaskText = ''

            // Auto-focus the input after adding a task
            setTimeout(() => {
                const input = document.getElementById('quick-task-input')
                if (input) input.focus()
            }, 10)
        }
    }
</script>

<div class="relative">
    <input
        id="quick-task-input"
        type="text"
        bind:this={inputEl}
        placeholder="Add a task and press Enter..."
        bind:value={newTaskText}
        class="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/70 border-0 text-slate-600 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 transition-all duration-200"
        onkeydown={(e) => {
            if (e.key === 'Enter') {
                onAddTask(inputEl.value)
                inputEl.value = ''
            }
        }}
    />
    <button
        class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
        onclick={handleAddTask}
        aria-label="Add task"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
    </button>
</div>
