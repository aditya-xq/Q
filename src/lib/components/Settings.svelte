<script lang="ts">
	import { onMount } from 'svelte'
	import { db, type QuickLink } from '$lib/utils/db'

	const defaultLinks: QuickLink[] = [
		{ category: 'AI App', name: 'ChatGPT', url: 'https://chat.openai.com' },
		{ category: 'OTT Platform', name: 'Netflix', url: 'https://www.netflix.com' },
		{ category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
		{ category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
	]

	let quickLinks: QuickLink[] = structuredClone(defaultLinks)
	let savingState: boolean[] = [false, false, false, false]
	let savedState: boolean[] = [false, false, false, false]
	let saveTimeouts: (ReturnType<typeof setTimeout> | null)[] = [null, null, null, null]
	let customUrls: string[] = ['', '', '', ''] // Track custom URLs separately

	const categories = ['AI App', 'OTT Platform', 'Email', 'Messaging']

	onMount(async () => {
		// Load by category instead of index
		for (let i = 0; i < categories.length; i++) {
			const stored = await db.table('quicklinks')
				.where('category')
				.equals(categories[i])
				.first()
			
			if (stored) {
				const predefinedLists = [aiApps, ottApps, emailApps, messagingApps]
				const list = predefinedLists[i]
				
				// Check if it's a predefined app (excluding 'Other')
				const predefinedApps = list.filter(app => app !== 'Other')
				if (predefinedApps.includes(stored.name)) {
					quickLinks[i] = stored
					customUrls[i] = ''
				} else {
					// It's a custom URL - store it properly
					quickLinks[i] = { ...stored, name: 'Other' }
					customUrls[i] = stored.url
				}
			}
		}
	})

	async function saveRow(index: number) {
		savingState[index] = true
		savedState[index] = false

		let row = { ...quickLinks[index] }

		// For 'Other', use the custom URL
		if (row.name === 'Other') {
			let trimmedUrl = customUrls[index]?.trim() || ''
			if (!trimmedUrl) {
				// Don't save empty URLs
				savingState[index] = false
				return
			}
			
			// Normalize URL - add protocol if missing
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				trimmedUrl = 'https://' + trimmedUrl
			}
			
			row.url = trimmedUrl
			// Keep name as 'Other' for consistency
		}

		try {
			// Use category as unique identifier
			const existing = await db.table('quicklinks')
				.where('category')
				.equals(row.category)
				.first()

			if (existing) {
				await db.table('quicklinks').update(existing.id!, row)
			} else {
				await db.table('quicklinks').add(row)
			}

			// Trigger update immediately
			quickLinks[index] = row
			
			savedState[index] = true
			setTimeout(() => (savedState[index] = false), 1500)
		} catch (e) {
			console.error('Failed to save row', e)
		} finally {
			savingState[index] = false
		}
	}

	function scheduleRowSave(index: number) {
		if (saveTimeouts[index]) {
			clearTimeout(saveTimeouts[index]!)
		}
		saveTimeouts[index] = setTimeout(() => saveRow(index), 500)
	}

	const aiApps = ['ChatGPT', 'Claude', 'Gemini', 'Other']
	const ottApps = ['Netflix', 'Prime Video', 'Hotstar', 'Other']
	const emailApps = ['Gmail', 'Outlook', 'Other']
	const messagingApps = ['WhatsApp', 'Telegram', 'Other']

	const categoryIcons = {
		'AI App': '🤖',
		'Email': '✉️',
		'Messaging': '💬',
        'OTT Platform': '🎬'
	}

	function aiAppUrl(name: string) {
		switch (name) {
			case 'ChatGPT': return 'https://chat.openai.com'
			case 'Claude': return 'https://claude.ai'
			case 'Gemini': return 'https://gemini.google.com'
			default: return ''
		}
	}
	function ottUrl(name: string) {
		switch (name) {
			case 'Netflix': return 'https://www.netflix.com'
			case 'Prime Video': return 'https://www.primevideo.com'
			case 'Hotstar': return 'https://www.hotstar.com'
			default: return ''
		}
	}
	function emailUrl(name: string) {
		switch (name) {
			case 'Gmail': return 'https://mail.google.com'
			case 'Outlook': return 'https://outlook.live.com'
			default: return ''
		}
	}
	function msgUrl(name: string) {
		switch (name) {
			case 'WhatsApp': return 'https://web.whatsapp.com'
			case 'Telegram': return 'https://web.telegram.org'
			default: return ''
		}
	}
</script>

<div class="space-y-10 max-w-3xl mx-auto px-4">
	<h1 class="text-3xl font-semibold text-gray-100 text-center mb-2">⚙️ Settings</h1>
	<p class="text-base text-gray-400 text-center mb-6">Configure your quick links</p>

	{#each [
		{ title: 'AI App', list: aiApps, index: 0, urlFn: aiAppUrl },
		{ title: 'Email', list: emailApps, index: 2, urlFn: emailUrl },
		{ title: 'Messaging', list: messagingApps, index: 3, urlFn: msgUrl },
        { title: 'OTT Platform', list: ottApps, index: 1, urlFn: ottUrl }
	] as { title, list, index, urlFn }}
		<section class="space-y-2">
			<h2 class="font-semibold text-gray-200 text-lg flex items-center gap-2">
				<span class="text-xl">{categoryIcons[title]}</span> {title}
			</h2>

			<div class="flex items-center gap-3 flex-wrap relative">
				{#each list as app}
					<button
						class="px-5 py-2.5 rounded-lg text-base font-medium transition-all duration-200
							{quickLinks[index].name === app
								? 'bg-white/25 text-white'
								: 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-100'}
						"
						on:click={() => {
							quickLinks[index] = { 
								...quickLinks[index], 
								name: app, 
								url: app === 'Other' ? (customUrls[index] || '') : urlFn(app) 
							}
							scheduleRowSave(index)
						}}
					>
						{app}
					</button>
				{/each}

				{#if quickLinks[index].name === 'Other'}
					<input
						type="url"
						bind:value={customUrls[index]}
						placeholder="Enter URL (e.g., https://example.com)..."
						class="ml-2 flex-1 min-w-[220px] px-3 py-2.5 rounded-lg bg-white/5 text-gray-100 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 text-base placeholder:text-gray-500"
						on:input={() => scheduleRowSave(index)}
					/>
				{/if}
			</div>

			{#if savingState[index]}
				<div class="text-xs text-gray-400 mt-1 select-none">Saving...</div>
			{:else if savedState[index]}
				<div class="text-xs text-green-400 mt-1 select-none">Saved ✅</div>
			{/if}
		</section>
	{/each}
</div>

<style>
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
