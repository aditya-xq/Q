<script lang="ts">
    import { fade } from "svelte/transition"
    import type { Task } from "$lib/utils/db"
  
    export let task: Task
    export let onToggle: (id: number, text: string, completed: boolean) => void
    export let onDelete: (id: number) => void
</script>
  
  <div transition:fade={{ duration: 200 }} class="task-item {task.completed ? 'opacity-70' : ''}">
    <div class="group rounded-lg transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 mb-1">
      <div class="flex items-center p-2">
        <div class="flex-shrink-0 mr-3">
          <label class="cursor-pointer flex items-center justify-center">
            <input 
              type="checkbox" 
              class="sr-only peer" 
              checked={task.completed} 
              on:change={() => onToggle(task.id as number, task.text, task.completed)} 
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
          <span 
            class={`block py-1 transition-all duration-200 ${
              task.completed 
                ? 'text-slate-500 dark:text-slate-500 line-through' 
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {task.text}
          </span>
        </div>
  
        <div class="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            class="p-1 rounded-full transition-colors text-slate-500 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
            on:click={() => onDelete(task.id as number)}
            aria-label="Delete task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
</div>

<style>
  /* Typography improvements */
  .task-item {
    font-size: 1.05rem;
  }
  
  .task-item {
    font-size: 1.1rem;
    line-height: 1.5;
  }

  /* Fade in animation for task items */
  .task-item {
    animation: fadeIn 0.3s ease-in-out;
  }
</style>