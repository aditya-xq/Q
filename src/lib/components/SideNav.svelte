<script lang="ts">
    import { onMount } from 'svelte'
    import { fade } from 'svelte/transition'
    import { appState, updateView, type View } from '$lib/state.svelte'
    import SideNavButton from './SideNavButton.svelte'

    let mobileMenuOpen = $state(false)
    let isMobile = $state(false)

    const menuItems = [
        {
            id: 'projects',
            label: 'Projects (Alt + P)',
            icon: '📋',
            view: 'projects',
        },
        {
            id: 'writer',
            label: 'Writer (Alt + W)',
            icon: '✍️',
            view: 'writer',
        },
    ]

    function checkMobile() {
        isMobile = window.innerWidth < 768 // md breakpoint
    }

    function navigate(view: View) {
        if (isMobile) {
            mobileMenuOpen = false
            // Small delay to allow menu close animation before view change
            setTimeout(() => updateView(view), 150)
        } else {
            updateView(view)
        }
    }

    onMount(() => {
        checkMobile()
        window.addEventListener('resize', checkMobile)

        return () => {
            window.removeEventListener('resize', checkMobile)
        }
    })
</script>

<!-- Mobile Menu Toggle Button (only on mobile) -->
{#if isMobile}
    <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label="Toggle Menu"
        class="fixed z-1001 top-3 left-3 rounded-full p-2
               text-white shadow-lg hover:shadow-xl
               hover:bg-slate-700 active:scale-95 transition-all duration-300"
    >
        <svg
            class="w-6 h-6 transition-transform duration-300"
            class:rotate-90={mobileMenuOpen}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            {/if}
        </svg>
    </button>
{/if}

<!-- Mobile Menu Overlay -->
{#if isMobile && mobileMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/50 z-999"
        onclick={() => (mobileMenuOpen = false)}
        transition:fade={{ duration: 200 }}
    ></div>
{/if}

<!-- Desktop Floating Menu / Mobile Slide-out Menu -->
<div
    class="fixed z-1000 transition-transform duration-300
           {isMobile
        ? 'top-0 left-0 h-full w-64 bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col py-20 px-4 gap-3 border-r border-slate-200 dark:border-slate-700'
        : 'top-5 left-4 flex flex-col gap-3'}"
    class:translate-x-0={isMobile && mobileMenuOpen}
    class:-translate-x-full={isMobile && !mobileMenuOpen}
>
    <SideNavButton view="home" label="Home" active={appState.view === 'home'} square {isMobile} onNavigate={navigate} />

    {#each menuItems as item (item.id)}
        <SideNavButton
            view={item.view as View}
            label={item.label}
            active={appState.view === item.view}
            emoji={item.icon}
            {isMobile}
            onNavigate={navigate}
        />
    {/each}
</div>
