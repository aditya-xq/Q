<script lang="ts">
    import { FrequentSites, Links, Notification, ProjectGrid, QuickTodo, SearchBar } from '$lib/components'
    import { appState } from '$lib/state.svelte'
    import { onMount } from 'svelte'
    import { fade, fly, slide, crossfade } from 'svelte/transition'
    import { cubicOut, quintOut } from 'svelte/easing'
    
    let frequentSites: { url: string; title: string; }[] = []
    
    // Create a crossfade transition for smoother view switching
    const [send, receive] = crossfade({
        duration: 400,
        fallback(node) {
            return {
                duration: 300,
                easing: quintOut,
                css: t => `opacity: ${t}`
            }
        }
    })
    
    onMount(() => {
        // Check system preference for dark mode and apply it
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
            document.documentElement.classList.add('dark')
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (e.matches) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        })
        
        // Try to get frequently visited sites if browser API is available
        if (chrome?.topSites?.get) {
            chrome.topSites.get((sites: any) => {
                frequentSites = sites.slice(0, 8)
            })
        } else {
            // Fallback for browsers without the API or for development
            frequentSites = [
                { url: 'https://github.com', title: 'GitHub' },
                { url: 'https://youtube.com', title: 'YouTube' },
                { url: 'https://twitter.com', title: 'Twitter' },
                { url: 'https://linkedin.com', title: 'LinkedIn' },
                { url: 'https://reddit.com', title: 'Reddit' },
                { url: 'https://chatgpt.com', title: 'ChatGPT' },
                { url: 'https://medium.com', title: 'Medium' },
                { url: 'https://techflix.xqbuilds.com', title: 'TechFlix' },
            ]
        }
    })
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300 flex">
    <Notification/>

    <!-- Google Profile in top right corner -->
    <div class="fixed top-4 right-4 z-30">
        <Links/>
    </div>
    
    <!-- Project Grid is always rendered but positioned differently based on state -->
    <div 
        class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 transition-all duration-500 ease-out"
        class:ml-80={!appState.projectView}
        style="opacity: {appState.projectView ? 1 : 0}; 
               pointer-events: {appState.projectView ? 'auto' : 'none'};
               position: {appState.projectView ? 'relative' : 'absolute'};"
        in:fade={{ duration: 400, easing: cubicOut, delay: 200 }}
    >
        <div in:fly={{ y: 20, duration: 500, delay: 300, easing: quintOut }}>
            <ProjectGrid/> 
        </div>
    </div>
    
    {#if !appState.projectView}
        <!-- Normal Mode - Show everything else -->
        <!-- Fixed QuickTodo sidebar -->
        <div 
            class="fixed left-0 top-0 h-full w-80 z-20 bg-slate-50 dark:bg-slate-900 shadow-lg overflow-y-auto"
            in:slide={{ axis: 'x', duration: 400, easing: cubicOut }}
            out:slide={{ axis: 'x', duration: 300 }}
        >
            <QuickTodo/>
        </div>
        
        <!-- Main content area with proper margin to account for sidebar -->
        <div class="ml-80 flex-1 transition-opacity duration-300"
             in:receive={{key: 'main-content'}}
             out:send={{key: 'main-content'}}>
            <!-- Fixed search bar and frequent sites -->
            <div 
                class="fixed top-72 left-80 right-0 z-10 pt-4 pb-4"
                in:fade={{ duration: 400, delay: 200 }}
            >
                <div class="w-full max-w-3xl mx-auto text-center px-4">
                    <div in:fly={{ y: -20, duration: 400, delay: 300, easing: cubicOut }}>
                        <SearchBar/>
                    </div>
                    <div in:fly={{ y: 20, duration: 400, delay: 400, easing: cubicOut }}>
                        <FrequentSites sites={frequentSites}/>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }

    :global(.fixed) {
        background-color: transparent;
        backdrop-filter: blur(5px);
    }
    
    :global(.font-sans) {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    /* Ensure dark mode works properly */
    :global(.dark) {
        color-scheme: dark;
    }
    
    /* Enhance scrollbar for light mode */
    :global(::-webkit-scrollbar) {
        width: 8px;
    }
    
    :global(::-webkit-scrollbar-track) {
        background: rgba(241, 245, 249, 0.5);
    }
    
    :global(::-webkit-scrollbar-thumb) {
        background-color: rgba(148, 163, 184, 0.5);
        border-radius: 4px;
    }
    
    :global(::-webkit-scrollbar-thumb:hover) {
        background-color: rgba(100, 116, 139, 0.6);
    }
    
    /* Enhance scrollbar for dark mode */
    :global(.dark ::-webkit-scrollbar) {
        width: 8px;
    }
    
    :global(.dark ::-webkit-scrollbar-track) {
        background: rgba(15, 23, 42, 0.3);
    }
    
    :global(.dark ::-webkit-scrollbar-thumb) {
        background-color: rgba(51, 65, 85, 0.5);
        border-radius: 4px;
    }
    
    :global(.dark ::-webkit-scrollbar-thumb:hover) {
        background-color: rgba(71, 85, 105, 0.7);
    }
</style>
