<script lang="ts">
    import { onMount } from 'svelte'
    import { fade } from 'svelte/transition'
    import { appState, updateView, type View } from '$lib/state.svelte'
    import { openThemeDesigner } from '$lib/stores/theme'
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

<svelte:window
    onkeydown={(event) => {
        if (event.key === 'Escape' && mobileMenuOpen) mobileMenuOpen = false
    }}
/>

<!-- Mobile Menu Toggle Button (only on mobile) -->
{#if isMobile}
    <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label="Toggle Menu"
        aria-expanded={mobileMenuOpen}
        aria-controls="nav-menu"
        class="fixed z-1001 top-3 left-3 rounded-lg border border-line bg-surface p-2
               text-fg shadow-lg hover:shadow-xl
               hover:bg-surface-2 hover:scale-105 active:scale-95 transition-all duration-300"
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
    id="nav-menu"
    class="fixed z-1000 transition-transform duration-300
           {isMobile
        ? 'top-0 left-0 h-full w-64 bg-bg shadow-2xl flex flex-col py-20 px-4 gap-3 border-r border-line'
        : 'top-5 left-4 flex flex-col gap-3'}"
    class:translate-x-0={isMobile && mobileMenuOpen}
    class:-translate-x-full={isMobile && !mobileMenuOpen}
    data-shortcut-blocker={isMobile && mobileMenuOpen ? '' : undefined}
    inert={isMobile && !mobileMenuOpen}
    aria-hidden={isMobile && !mobileMenuOpen}
>
    <SideNavButton view="home" label="Home" active={appState.view === 'home'} {isMobile} onNavigate={navigate} />

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

    <button
        type="button"
        onclick={openThemeDesigner}
        aria-label="Appearance (Alt + A)"
        aria-haspopup="dialog"
        aria-expanded={appState.themeDesignerOpen}
        data-tooltip={isMobile ? null : 'Appearance (Alt + A)'}
        data-tooltip-position="right"
        class="group rounded-lg border border-line bg-surface text-fg-muted shadow-sm transition-all duration-300
               hover:border-accent hover:text-accent-text hover:scale-105 hover:shadow-md active:scale-95
               {isMobile ? 'w-full p-4 flex items-center gap-3' : 'p-2'}"
    >
        <span
            class="flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:rotate-12
            {isMobile ? 'h-9 w-9 text-2xl' : 'h-6 w-6 text-xl'}"
        >
            🎨
        </span>
        {#if isMobile}
            <span class="text-sm font-medium">Appearance</span>
        {/if}
    </button>
</div>
