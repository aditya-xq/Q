<script lang="ts">
    import type { Task } from '$lib/utils/db'
    import { updateTask, deleteTask } from '$lib/utils/stores'
    import { DeleteButton } from '../shared'

    interface Props {
        task: Task
        onToggleComplete: () => void
    }

    let { task, onToggleComplete }: Props = $props()

    let editing = $state(false)
    let editedText = $derived(task.text)
    let isHovered = $state(false)

    function toggleComplete() {
        updateTask(task.id as number, task.text, !task.completed)
        onToggleComplete()
    }

    function saveEdit() {
        if (editedText.trim() !== '') {
            updateTask(task.id as number, editedText, task.completed)
            editing = false
        }
    }

    $effect(() => {
        if (editing) {
            setTimeout(() => {
                const input = document.getElementById(`task-edit-${task.id}`)
                if (input) input.focus()
            }, 10)
        }
    })
</script>

<div
    class="group rounded-lg transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
    role="button"
    tabindex="0"
>
    <div class="flex items-center p-3">
        <div class="shrink-0 mr-4">
            <label class="cursor-pointer flex items-center justify-center">
                <input type="checkbox" class="sr-only peer" checked={task.completed} onchange={toggleComplete} />
                <div
                    class={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                        task.completed
                            ? 'bg-linear-to-r from-indigo-500/90 to-indigo-600/90 dark:from-indigo-600 dark:to-indigo-800 border-transparent shadow-sm'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 hover:border-indigo-400/50 dark:hover:border-indigo-500/50'
                    } peer-focus:ring-2 peer-focus:ring-indigo-500/30 dark:peer-focus:ring-indigo-400/20`}
                >
                    {#if task.completed}
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                    {/if}
                </div>
            </label>
        </div>

        <div class="grow min-w-0">
            {#if editing}
                <input
                    id={`task-edit-${task.id}`}
                    type="text"
                    bind:value={editedText}
                    class="w-full rounded-lg py-2 px-3 text-base bg-slate-100/80 dark:bg-slate-800/80 border-0 text-slate-700 dark:text-slate-200
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 shadow-sm backdrop-blur-sm"
                    onblur={saveEdit}
                    onkeydown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') {
                            editing = false
                            editedText = task.text
                        }
                    }}
                />
            {:else}
                <span
                    class={`block py-1 text-base transition-all duration-200 cursor-pointer truncate text-wrap ${
                        task.completed
                            ? 'text-slate-500 dark:text-slate-500 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                    }`}
                    onclick={() => (editing = true)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            editing = true
                        }
                    }}
                    title={task.text}
                >
                    {task.text}
                </span>
            {/if}
        </div>

        <div class={`shrink-0 ml-3 flex items-center gap-1 transition-opacity duration-200 ${isHovered || editing ? 'opacity-100' : 'opacity-0'}`}>
            {#if !editing}
                <button
                    class="p-1.5 rounded-full transition-colors text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
                    onclick={() => (editing = true)}
                    aria-label="Edit task"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
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
