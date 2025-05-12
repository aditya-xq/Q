<script lang="ts">
    import TaskItem from "./TaskItem.svelte";
    import type { Task } from "$lib/utils/db";
  
    export let tasks: Task[] = [];
    export let onToggleComplete: (id: number, text: string, completed: boolean) => void;
    export let onRemoveTask: (id: number) => void;
  
    $: incompleteTasks = tasks.filter(t => !t.completed);
    $: completedTasks = tasks.filter(t => t.completed);
  </script>
  
  <div class="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
    <div class="p-2">
      {#if tasks.length === 0}
        <p class="text-sm italic text-slate-500 dark:text-slate-500 text-center py-4">
          No tasks yet. Add something above.
        </p>
      {:else}
        <!-- Incomplete tasks -->
        {#each incompleteTasks as task (task.id)}
          <TaskItem {task} onToggle={onToggleComplete} onDelete={onRemoveTask} />
        {/each}
        
        <!-- Completed tasks section -->
        {#if completedTasks.length > 0}
          <div class="mt-4 mb-2 px-2">
            <div class="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">
              Completed
            </div>
            <div class="h-px bg-slate-200/70 dark:bg-slate-800/70 my-2"></div>
          </div>
          
          {#each completedTasks as task (task.id)}
            <TaskItem {task} onToggle={onToggleComplete} onDelete={onRemoveTask} />
          {/each}
        {/if}
      {/if}
    </div>
  </div>
  
<style>
    /* Custom scrollbar styling */
    .scrollbar-thin::-webkit-scrollbar {
      width: 6px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background-color: rgba(203, 213, 225, 0.8);
      border-radius: 3px;
    }
</style>
  