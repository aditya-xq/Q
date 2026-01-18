<script lang="ts">
    import { addTask } from '$lib/utils/stores'

    let { projectId } = $props()

    let newTaskText = $state('')

    function addNewTask() {
        if (newTaskText.trim() !== '') {
            addTask(projectId, newTaskText)
            newTaskText = ''
        }
    }
</script>

<div class="relative">
    <input
        type="text"
        placeholder="Add a new task..."
        bind:value={newTaskText}
        class="w-full pl-4 pr-12 py-2 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-600 
            transition-all duration-200 border-0 focus:border-0 focus:outline-none focus:ring-0"
        onkeydown={(e) => {
            if (e.key === 'Enter') addNewTask()
        }}
    />
    <button
        class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 
            hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
        onclick={addNewTask}
        aria-label="Add task"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
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
    </button>
</div>
