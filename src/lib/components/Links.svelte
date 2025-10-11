<script lang="ts">
	import { onMount } from 'svelte'
	import { db, type QuickLink } from '$lib/utils/db'
	import { writable, derived } from 'svelte/store'
	import { liveQuery } from 'dexie'

	const quickLinksStore = writable<QuickLink[]>([])

	const defaultLinks: QuickLink[] = [
		{ category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
		{ category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
		{ category: 'OTT Platform', name: 'Netflix', url: 'https://www.netflix.com' }
	]

	const icons: Record<string, string> = {
		'Email': `
			<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 
			2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
			<path d="M3 6l9 6 9-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
		`,
		'Messaging': `
			<path d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 
			2-2V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
			<circle cx="9" cy="10" r="1" fill="currentColor"/>
			<circle cx="12" cy="10" r="1" fill="currentColor"/>
			<circle cx="15" cy="10" r="1" fill="currentColor"/>
		`,
		'OTT Platform': `
			<rect x="3" y="4" width="18" height="12" rx="2" ry="2" 
			stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
			<polygon points="10,9 15,12 10,15" fill="currentColor"/>
			<path d="M2 20h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		`
	}

	function getIcon(category: string): string {
		return icons[category] || ''
	}

	function openLink(url: string) {
		if (!url) return
		window.open(url, '_blank')
	}

	// Extract a friendly name from URL
	function extractNameFromUrl(url: string): string {
		if (!url) return 'Custom Link'
		
		try {
			// Normalize URL - add protocol if missing
			let normalizedUrl = url.trim()
			if (!normalizedUrl.match(/^https?:\/\//i)) {
				normalizedUrl = 'https://' + normalizedUrl
			}
			
			const urlObj = new URL(normalizedUrl)
			let hostname = urlObj.hostname
			
			// Remove 'www.' prefix
			hostname = hostname.replace(/^www\./, '')
			
			// Remove common TLDs and get the main domain name
			const parts = hostname.split('.')
			let mainPart = parts[0]
			
			// Handle special cases
			if (parts.length > 2) {
				// For domains like 'chat.openai.com', take the second-to-last part
				mainPart = parts[parts.length - 2]
			}
			
			// Capitalize first letter and handle common abbreviations
			const name = mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
			
			return name
		} catch (e) {
			console.error('Error extracting name from URL:', e)
			return 'Custom Link'
		}
	}

	onMount(() => {
		// Use liveQuery for reactive updates
		const subscription = liveQuery(async () => {
			const stored = await db.table('quicklinks').toArray()
			if (stored.length > 0) {
				const filtered = stored.filter(l =>
					['Email', 'Messaging', 'OTT Platform'].includes(l.category)
				)
				return filtered.length ? filtered : defaultLinks
			}
			return defaultLinks
		}).subscribe(links => {
			if (links) {
				quickLinksStore.set(links)
			}
		})

		// Cleanup subscription on unmount
		return () => subscription.unsubscribe()
	})

	const renderedLinks = derived(quickLinksStore, $links => {
		return ['Email', 'Messaging', 'OTT Platform'].map(category => {
			const link = $links.find(l => l.category === category) || 
			             defaultLinks.find(d => d.category === category)
			
			if (link && link.name === 'Other' && link.url) {
				// For custom links, extract name from URL
				return {
					...link,
					name: extractNameFromUrl(link.url)
				}
			}
			
			return link
		}).filter(Boolean) as QuickLink[]
	})
</script>

<div class="flex items-center text-lg flex-wrap gap-3">
	{#each $renderedLinks as link}
		<button
			class="flex items-center justify-center px-3 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
			title={link.url}
			onclick={() => openLink(link.url)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
				{@html getIcon(link.category)}
			</svg>
			<span>{link.name}</span>
		</button>
	{/each}
</div>
