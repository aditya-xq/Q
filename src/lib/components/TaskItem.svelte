<script lang="ts">
    import type { Task } from '$lib/utils/db'
    import { updateTask, deleteTask } from '$lib/utils/stores'
    import { DeleteButton } from './shared'

    export let task: Task

    let editing = false
    let editedText = task.text
    let isHovered = false

    function toggleComplete() {
        updateTask(task.id as number, task.text, !task.completed)
    }

    function saveEdit() {
        if (editedText.trim() !== '') {
            updateTask(task.id as number, editedText, task.completed)
            editing = false
        }
    }

    // Auto-focus the input when editing
    $: if (editing) {
        setTimeout(() => {
            const input = document.getElementById(`task-edit-${task.id}`)
            if (input) input.focus()
        }, 10)
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="group rounded-lg transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
>
    <div class="flex items-center p-2 text-sm">
        <div class="flex-shrink-0 mr-3">
            <label class="cursor-pointer flex items-center justify-center">
                <input type="checkbox" class="sr-only peer" checked={task.completed} on:change={toggleComplete} />
                <div
                    class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        task.completed
                            ? 'bg-gradient-to-r from-indigo-500/90 to-indigo-600/90 dark:from-indigo-600 dark:to-indigo-800 border-transparent shadow-sm'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50'
                    } peer-focus:ring-2 peer-focus:ring-indigo-500/30 dark:peer-focus:ring-indigo-400/20`}
                >
                    {#if task.completed}
                        <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                    {/if}
                </div>
            </label>
        </div>

        <div class="flex-grow">
            {#if editing}
                <input
                    id={`task-edit-${task.id}`}
                    type="text"
                    bind:value={editedText}
                    class="w-full rounded-lg py-1.5 px-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-0 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 shadow-sm backdrop-blur-sm"
                    on:blur={saveEdit}
                    on:keydown={(e) => e.key === 'Enter' && saveEdit()}
                />
            {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <span
                    class={`block py-1 transition-all duration-200 cursor-pointer ${
                        task.completed
                            ? 'text-slate-500 dark:text-slate-500 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                    }`}
                    on:click={() => (editing = true)}
                >
                    {task.text}
                </span>
            {/if}
        </div>

        <div class={`flex-shrink-0 ml-2 transition-opacity duration-200`}>
            {#if !editing}
                <button
                    class="p-1 rounded-full mr-1 transition-colors text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
                    on:click={() => (editing = true)}
                    aria-label="Edit task"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                    </svg>
                </button>
            {/if}
            <DeleteButton handleDelete={() => deleteTask(task.id as number)} />
        </div>
    </div>
</div>
