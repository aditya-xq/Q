<script lang="ts">
    import { addTask, deleteProject, updateProject, type ProjectWithTasks } from '$lib/utils/stores'
    import TaskItem from './TaskItem.svelte'
    import { fade, slide } from 'svelte/transition'
    
    export let project: ProjectWithTasks
  
    let editingTitle = false
    let editedTitle = project.title
    let newTaskText = ''
    let showConfirmDelete = false
    let isHovered = false
  
    function saveTitle() {
      if (editedTitle.trim() !== '') {
        updateProject(project.id as number, editedTitle)
        editingTitle = false
      }
    }
  
    function addNewTask() {
      if (newTaskText.trim() !== '') {
        addTask(project.id as number, newTaskText)
        newTaskText = ''
      }
    }
  
    function handleDeleteProject() {
      if (showConfirmDelete) {
        deleteProject(project.id as number)
        showConfirmDelete = false
      } else {
        showConfirmDelete = true
      }
    }

    function cancelDelete() {
      showConfirmDelete = false
    }

    // Auto-focus the title input when editing
    $: if (editingTitle) {
      setTimeout(() => {
        const input = document.getElementById(`project-title-${project.id}`)
        if (input) input.focus()
      }, 10)
    }
</script>
  
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="rounded-xl shadow-sm backdrop-blur-sm bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 h-full flex flex-col hover:shadow-md"
  on:mouseenter={() => isHovered = true}
  on:mouseleave={() => isHovered = false}
>
  <div class="p-4 border-b border-slate-200/70 dark:border-slate-800/70 text-md">
    <div class="flex justify-between items-center">
      {#if editingTitle}
        <input
          id={`project-title-${project.id}`}
          type="text"
          bind:value={editedTitle}
          class="w-full bg-slate-100/80 dark:bg-slate-800/70 border-0 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 font-medium text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm"
          on:blur={saveTitle}
          on:keydown={(e) => e.key === 'Enter' && saveTitle()} 
        />
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <h2 
          class="text-lg font-semibold text-slate-700 dark:text-slate-100 transition-colors cursor-pointer group"
          on:click={() => (editingTitle = true)}
        >
          {project.title}
          {#if isHovered && !editingTitle}
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">(edit)</span>
          {/if}
        </h2>
      {/if}
      
      <button 
        class="p-1.5 rounded-full transition-colors text-slate-500 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
        on:click={handleDeleteProject}
        aria-label="Delete project"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    {#if showConfirmDelete}
      <div 
        class="mt-3 p-3 rounded-lg bg-red-50/90 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 backdrop-blur-sm"
        transition:slide={{ duration: 200 }}
      >
        <p class="text-sm text-red-700 dark:text-red-300 mb-2">Are you sure you want to delete this project?</p>
        <div class="flex justify-end space-x-2">
          <button 
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            on:click={cancelDelete}
          >
            Cancel
          </button>
          <button 
            class="px-3 py-1.5 text-xs rounded-lg bg-red-500/90 hover:bg-red-600/90 dark:bg-red-700 dark:hover:bg-red-600 text-white transition-colors"
            on:click={handleDeleteProject}
          >
            Delete
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="flex-grow overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
    <div class="p-4 space-y-2">
      {#if project.tasks.length === 0}
        <p class="text-sm italic text-slate-500 dark:text-slate-500 text-center py-4">
          No tasks yet. Add your first task below.
        </p>
      {:else}
        {#each project.tasks as task (task.id)}
          <div transition:fade={{ duration: 200 }}>
            <TaskItem {task} />
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="p-4 border-t border-slate-200/70 dark:border-slate-800/70">
    <div class="relative">
      <input
        type="text"
        placeholder="Add a new task..."
        bind:value={newTaskText}
        class="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/70 border-0 text-slate-700 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/20 transition-all duration-200"
        on:keydown={(e) => { if(e.key === 'Enter') addNewTask() }}
      />
      <button 
        class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-slate-500 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors"
        on:click={addNewTask}
        aria-label="Add task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar styles */
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb {
    background-color: rgb(203 213 225);
    border-radius: 2px;
  }
  
  .scrollbar-track-transparent::-webkit-scrollbar-track {
    background: transparent;
  }
</style>