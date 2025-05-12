<script lang="ts">
  import { onMount } from "svelte"
  import { db } from "$lib/utils/db"
  import type { Task, Project } from "$lib/utils/db"
  import { ensureQuickTodoProject } from "$lib/utils/stores"
  
  // Import our components
  import TaskList from "./TaskList.svelte"
  import QuickAddInput from "./QuickAddInput.svelte"
  
  export let listTitle = "✅ Queue"
  
  // Static unique identifier for QuickTodo
  const QUICK_TODO_ID = -1 // Using a negative ID to ensure it doesn't conflict with regular projects
  
  let tasks: Task[] = []
  let projects: Project[] = []
  let isLoading = true
  
  // Load tasks for the QuickTodo
  async function loadTasks() {
    isLoading = true
    const allTasks = await db.tasks.where('projectId').equals(QUICK_TODO_ID).toArray()
    // Sort tasks: incomplete tasks first, then completed tasks
    tasks = allTasks.sort((a, b) => {
      if (a.completed === b.completed) {
        // If completion status is the same, sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      // Incomplete tasks come first
      return a.completed ? 1 : -1
    })
    isLoading = false
  }
  
  // Load all projects
  async function loadProjects() {
    projects = await db.projects.toArray();
    // Filter out the QuickTodo project if it exists in the regular projects list
    projects = projects.filter(project => project.id !== QUICK_TODO_ID);
  }
  
  // CRUD operations for tasks
  async function addNewTask(text: string) {
    if (!text.trim()) return;
    const createdAt = new Date()
    const task = { projectId: QUICK_TODO_ID, text, completed: false, createdAt }
    await db.tasks.add(task)
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
    // Ensure the QuickTodo project exists
    await ensureQuickTodoProject()
    await Promise.all([loadTasks(), loadProjects()])
  })
</script>

{#if !isLoading}
<!-- Fixed left side panel -->
<div class="quick-todo-container">
  <div class="panel-content">
    <!-- Quick Todo Section -->
    <div class="panel-section">
      <!-- Header with static title -->
      <div class="panel-header">
        <h2 class="panel-title">{listTitle}</h2>
      </div>
      
      <!-- Quick Add Input -->
      <div class="quick-add-container">
        <QuickAddInput onAddTask={addNewTask}/>
      </div>
      
      <!-- Task List with scrollable container -->
      <div class="tasks-container">
        <TaskList 
          {tasks} 
          onToggleComplete={toggleComplete} 
          onRemoveTask={removeTask} 
        />
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  /* Container styles */
  .quick-todo-container {
    height: 100%;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 900;
    display: flex;
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }

  /* Panel content styles */
  .panel-content {
    height: 100%;
    width: 20rem; /* 320px */
    border-radius: 0 0.75rem 0.75rem 0;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(8px);
    background-color: rgba(248, 250, 252, 0.95);
    border-right: 1px solid rgba(226, 232, 240, 0.5);
    border-top: 1px solid rgba(226, 232, 240, 0.5);
    border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    z-index: 900;
  }

  /* Panel sections */
  .panel-section {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Dark mode support */
  :global(.dark) .panel-content {
    background-color: rgba(15, 23, 42, 0.95);
    border-color: rgba(30, 41, 59, 0.5);
  }

  .panel-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(226, 232, 240, 0.7);
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  :global(.dark) .panel-header {
    border-color: rgba(30, 41, 59, 0.7);
  }

  :global(.dark) .panel-title {
    color: #e2e8f0;
  }

  .quick-add-container {
    padding: 1rem;
    border-bottom: 1px solid rgba(226, 232, 240, 0.7);
    flex-shrink: 0;
  }

  :global(.dark) .quick-add-container {
    border-color: rgba(30, 41, 59, 0.7);
  }
  
  /* Scrollable containers */
  .tasks-container {
    flex-grow: 1;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  
  /* Scrollbar styling */
  .tasks-container::-webkit-scrollbar {
    width: 4px;
  }
  
  .tasks-container::-webkit-scrollbar-thumb {
    background-color: rgba(100, 116, 139, 0.5);
    border-radius: 4px;
  }
  
  :global(.dark) .tasks-container::-webkit-scrollbar-thumb {
    background-color: rgba(148, 163, 184, 0.5);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
