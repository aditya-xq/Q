<script lang="ts">
    import { onMount } from 'svelte'
    import { db } from '$lib/utils/db'

    interface QuickLink {
        id?: number
        category: string
        name: string
        url: string
    }

    const defaultLinks: QuickLink[] = [
        { category: 'Main Email Account', name: 'Gmail', url: 'https://mail.google.com' },
        { category: 'Main Messaging App', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
        { category: 'Main OTT Platform', name: 'Netflix', url: 'https://www.netflix.com' },
    ]

    let links: QuickLink[] = structuredClone(defaultLinks)

    onMount(async () => {
        try {
            const stored = await db.table('quicklinks').toArray()
            if (stored.length > 0) links = stored
        } catch (err) {
            console.error('Failed to load quick links:', err)
        }
    })

    function openLink(url: string) {
        window.open(url, '_blank')
    }

    // Category → refined SVG icon map (clean, dark-friendly)
    const icons: Record<string, string> = {
        // ✉️ Clean envelope for Email
        'Main Email Account': `
            <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 
            2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M3 6l9 6 9-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `,

        // 💬 Modern chat bubble for Messaging
        'Main Messaging App': `
            <path d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 
            2-2V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="10" r="1" fill="currentColor"/>
            <circle cx="12" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
        `,

        // 🎬 Movie screen & play button for OTT
        'Main OTT Platform': `
            <rect x="3" y="4" width="18" height="12" rx="2" ry="2" 
            stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <polygon points="10,9 15,12 10,15" fill="currentColor"/>
            <path d="M2 20h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        `,
    }

    function getIcon(category: string): string {
        return icons[category]
    }
</script>

<div class="flex items-center text-lg flex-wrap gap-2">
    {#each links as link}
        <button
            class="flex items-center justify-center px-3 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={link.name}
            onclick={() => openLink(link.url)}
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                {@html getIcon(link.category)}
            </svg>
            <span>{link.name}</span>
        </button>
    {/each}
</div>
