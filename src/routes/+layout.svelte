<script lang="ts">
    import { QuickTodo } from '$lib/components'
    import { cubicOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import '../app.css'
    let { children } = $props()
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickTodo</title>
    <meta charset="UTF-8" />
</svelte:head>

<!-- ===== Layout Container ===== -->
<div class="flex h-screen text-slate-900 dark:text-slate-100 overflow-hidden">
    <!-- Sidebar / Floating QuickTodo -->
    <div
        class="fixed left-0 top-0 h-full w-16 z-50 flex flex-col items-center pt-4 pb-6 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-xl"
        in:slide={{ axis: 'x', duration: 400, easing: cubicOut }}
        out:slide={{ axis: 'x', duration: 300 }}
    >
        <QuickTodo />
    </div>

    <!-- Main Content Wrapper -->
    <main class="flex-1 ml-16 overflow-y-auto relative transition-all duration-300">
        {@render children()}
    </main>
</div>
