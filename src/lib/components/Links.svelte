<script lang="ts">
	import { onMount } from 'svelte'
	import { db, type QuickLink } from '$lib/utils/db'
	import { liveQuery } from 'dexie'

	let quickLinks = $state<QuickLink[]>([])
	let isOpen = $state(false)

	const defaultLinks: QuickLink[] = [
		{ category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
		{ category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
		{ category: 'OTT', name: 'Netflix', url: 'https://www.netflix.com' },
		{ category: 'AI', name: 'ChatGPT', url: 'https://www.chatgpt.com' },
		{ category: 'Social', name: 'X.com', url: 'https://x.com' },
		{ category: 'Custom', name: 'Techflix', url: 'https://techflix.club' },
	]

	const linkIcons: Record<string, string> = {
		'Gmail': 'https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63',
		'WhatsApp': 'https://static.whatsapp.net/rsrc.php/v3/yz/r/ujTY9i_Jhs1.png',
		'Telegram': 'https://telegram.org/img/t_logo.png',
		'Netflix': 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png',
		'ChatGPT': 'https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png',
		'Claude': 'https://claude.ai/images/claude_app_icon.png',
		'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
		'X': 'https://abs.twimg.com/favicons/twitter.3.ico',
		'Instagram': 'https://static.cdninstagram.com/rsrc.php/v3/yt/r/30PrGfR3xhB.png',
		'Reddit': 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
		'GitHub': 'https://github.githubassets.com/favicons/favicon.png',
	}

	const categories = ['Email', 'Messaging', 'OTT', 'AI', 'Social', 'Custom']

	function getIconUrl(name: string, url: string): string {
		if (linkIcons[name]) {
			return linkIcons[name]
		}
		
		try {
			const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url)
			return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
		} catch {
			return `https://www.google.com/s2/favicons?domain=example.com&sz=32`
		}
	}

	function openLink(url: string) {
		if (!url) return
		window.location.href = url
		isOpen = false
	}

	function extractNameFromUrl(url: string): string {
		if (!url) return 'Custom Link'
		
		try {
			let normalizedUrl = url.trim()
			if (!normalizedUrl.match(/^https?:\/\//i)) {
				normalizedUrl = 'https://' + normalizedUrl
			}
			
			const urlObj = new URL(normalizedUrl)
			let hostname = urlObj.hostname
			
			hostname = hostname.replace(/^www\./, '')
			
			const parts = hostname.split('.')
			let mainPart = parts[0]
			
			if (parts.length > 2) {
				mainPart = parts[parts.length - 2]
			}
			
			const name = mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
			
			return name
		} catch (e) {
			console.error('Error extracting name from URL:', e)
			return 'Custom Link'
		}
	}

	onMount(() => {
		const subscription = liveQuery(async () => {
			const stored = await db.table('quicklinks').toArray()
			if (stored.length > 0) {
				const filtered = stored.filter(l => categories.includes(l.category))
				return filtered.length ? filtered : defaultLinks
			}
			return defaultLinks
		}).subscribe(links => {
			if (links) {
				quickLinks = categories.map(category => {
					const link = links.find(l => l.category === category) || 
					             defaultLinks.find(d => d.category === category)
					
					if (link && link.name === 'Other' && link.url) {
						return {
							...link,
							name: extractNameFromUrl(link.url)
						}
					}
					
					return link
				}).filter(Boolean) as QuickLink[]
			}
		})

		return () => subscription.unsubscribe()
	})
</script>

<!-- Desktop: Fixed sidebar on the right -->
<aside
	class="hidden md:flex fixed right-0 top-0 h-full w-16 z-50 flex-col items-center pt-4 pb-6
	   bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800
	   shadow-xl"
>
	<div class="fixed top-5 right-3.5 flex flex-col gap-3">
		{#each quickLinks as link}
			<button
				class="group rounded-lg p-2 border border-slate-200 dark:border-slate-700
					bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
					shadow-sm hover:shadow-md hover:border-sky-400 transition-all duration-300
					hover:scale-105 active:scale-95"
				data-tooltip={link.name}
				onclick={() => openLink(link.url)}
				aria-label={link.name}
			>
				<img 
					src={getIconUrl(link.name, link.url)} 
					alt={link.name}
					class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
					onerror={(e) => {
						(e.currentTarget as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=example.com&sz=32'
					}}
				/>
			</button>
		{/each}
	</div>
</aside>

<!-- Mobile: Collapsible menu with floating button -->
<div class="md:hidden">
	<!-- Backdrop -->
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
			onclick={() => isOpen = false}
		></div>
	{/if}

	<!-- Quick Links Menu -->
	<div
		class="fixed top-15 right-3 z-50 transition-all duration-300 ease-out origin-top-right"
		style:transform={isOpen ? 'scale(1)' : 'scale(0)'}
		style:opacity={isOpen ? '1' : '0'}
	>
		<div class="rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-50">
			<div class="grid grid-cols-2 gap-3">
				{#each quickLinks as link}
					<button
						class="group flex flex-col items-center gap-1.5 p-4 rounded-xl
							bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700
							hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950
							transition-all duration-200 active:scale-95"
						onclick={() => openLink(link.url)}
						aria-label={link.name}
					>
						<img 
							src={getIconUrl(link.name, link.url)} 
							alt={link.name}
							class="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
							onerror={(e) => {
								(e.currentTarget as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=example.com&sz=32'
							}}
						/>
						<span class="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
							{link.name}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Floating Toggle Button -->
	<button
		class="fixed top-3 right-3 z-50 w-10 h-10 rounded-full
			border-2 border-slate-300 dark:border-slate-600
			shadow-lg hover:shadow-xl active:shadow-md
			flex items-center justify-center
			transition-all duration-300 ease-out
			hover:scale-110 active:scale-95"
		onclick={() => isOpen = !isOpen}
		aria-label="Toggle quick links"
		style:transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
	>
		<span class="text-xl">🔗</span>
	</button>
</div>
