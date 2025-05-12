<script lang="ts">
  import type { Task } from "$lib/utils/db"
  import { updateTask, deleteTask } from "$lib/utils/stores"
  import { slide } from "svelte/transition"

  export let task: Task

  let editing = false
  let editedText = task.text
  let showConfirmDelete = false
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

  function handleDelete() {
    if (showConfirmDelete) {
      deleteTask(task.id as number)
    } else {
      showConfirmDelete = true
    }
  }

  function cancelDelete() {
    showConfirmDelete = false
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
  on:mouseenter={() => isHovered = true}
  on:mouseleave={() => isHovered = false}
>
  <div class="flex items-center p-2 text-sm">
    <div class="flex-shrink-0 mr-3">
      <label class="cursor-pointer flex items-center justify-center">
        <input 
          type="checkbox" 
          class="sr-only peer" 
          checked={task.completed} 
          on:change={toggleComplete} 
        />
        <div class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          task.completed 
            ? 'bg-gradient-to-r from-indigo-500/90 to-indigo-600/90 dark:from-indigo-600 dark:to-indigo-800 border-transparent shadow-sm' 
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50'
        } peer-focus:ring-2 peer-focus:ring-indigo-500/30 dark:peer-focus:ring-indigo-400/20`}>
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

    <div class={`flex-shrink-0 ml-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
      {#if !editing}
        <button 
          class="p-1 rounded-full mr-1 transition-colors text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
          on:click={() => (editing = true)}
          aria-label="Edit task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      {/if}
      
      <button 
        class="p-1 rounded-full transition-colors text-slate-500 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
        on:click={handleDelete}
        aria-label="Delete task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>

  {#if showConfirmDelete}
    <div 
      class="mx-2 mb-2 p-2 rounded-md text-xs bg-red-50/90 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 backdrop-blur-sm"
      transition:slide={{ duration: 150 }}
    >
      <p class="text-red-700 dark:text-red-300 mb-1.5">Delete this task?</p>
      <div class="flex justify-end space-x-2">
        <button 
          class="px-2 py-0.5 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          on:click={cancelDelete}
        >
          Cancel
        </button>
        <button 
          class="px-2 py-0.5 text-xs rounded-md bg-red-500/90 hover:bg-red-600/90 dark:bg-red-700 dark:hover:bg-red-600 text-white transition-colors"
          on:click={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  {/if}
</div>
