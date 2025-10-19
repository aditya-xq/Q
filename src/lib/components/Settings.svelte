<script lang="ts">
	import { onMount } from 'svelte'
	import { db, type QuickLink } from '$lib/utils/db'
    import { appState } from '$lib/state.svelte'
    import { quintOut } from 'svelte/easing'
    import { fly, slide } from 'svelte/transition'
    import { getSetting, updateSetting } from '$lib/utils/stores'

	const defaultLinks: QuickLink[] = [
		{ category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
		{ category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
	]

	let quickLinks: QuickLink[] = structuredClone(defaultLinks)
	let savingState: boolean[] = [false, false, false, false]
	let savedState: boolean[] = [false, false, false, false]
	let saveTimeouts: (ReturnType<typeof setTimeout> | null)[] = [null, null, null, null]
	let customUrls: string[] = ['', ''] // Track custom URLs separately

	const categories = ['Email', 'Messaging']

	onMount(async () => {
		// Load by category instead of index
		for (let i = 0; i < categories.length; i++) {
			const stored = await db.table('quicklinks')
				.where('category')
				.equals(categories[i])
				.first()
			
			if (stored) {
				const predefinedLists = [emailApps, messagingApps]
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
		// Initialize keepQuickPanelOpen from DB (fallback to false)
        const keep = await getSetting('keepQuickPanelOpen')
        appState.keepQuickPanelOpen = typeof keep === 'boolean' ? keep : false
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

	const emailApps = ['Gmail', 'Outlook', 'Other']
	const messagingApps = ['WhatsApp', 'Telegram', 'Other']

	const categoryIcons = {
		'Email': '✉️',
		'Messaging': '💬',
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

	function toggleSettingsView() {
        appState.settingsView = !appState.settingsView
    }

    async function toggleKeepQuickPanelOpen() {
        const newVal = !appState.keepQuickPanelOpen
        await updateSetting('keepQuickPanelOpen', newVal)
        appState.keepQuickPanelOpen = newVal
    }
</script>

<!-- ===== Settings Button & Panel ===== -->
<div class="fixed bottom-5 left-3 z-[1000]">
	{#if appState.settingsView}
		<div
			class="absolute bottom-full mb-3 w-[calc(100vw-2.5rem)] max-w-md origin-bottom-left pl-4 pr-12"
			in:fly={{ y: 10, duration: 300, easing: quintOut }}
			out:slide={{ axis: 'y', duration: 200 }}
		>
			<div
				class="bg-slate-800 dark:bg-slate-950 rounded-2xl border border-slate-600 shadow-2xl overflow-hidden"
			>
				<!-- Header-->
				<div class="relative bg-slate-800/80 dark:bg-slate-950 px-5 py-4 border-b border-slate-700">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<h1 class="text-lg font-semibold text-gray-100">Settings</h1>
						</div>
						<button
							onclick={toggleSettingsView}
							class="w-7 h-7 rounded-lg bg-white/5 dark:bg-slate-950 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all"
							aria-label="Close settings"
						>
							<span class="text-sm">✕</span>
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="p-5 space-y-5">
					{#each [
						{ title: 'Email', list: emailApps, index: 0, urlFn: emailUrl },
						{ title: 'Messaging', list: messagingApps, index: 1, urlFn: msgUrl },
					] as { title, list, index, urlFn }}
						<section class="space-y-2">
							<!-- Section Title with improved spacing -->
							<div class="flex items-center gap-2">
								<span class="text-base">{categoryIcons[title]}</span>
								<h2 class="text-sm font-semibold text-gray-200 uppercase tracking-wide">{title}</h2>
							</div>

							<!-- Options with improved spacing and hover states -->
							<div class="flex items-center gap-4 flex-wrap">
								{#each list as app}
									<button
										class="p-2 rounded-lg text-sm font-medium transition-all duration-200
											{quickLinks[index].name === app
												? 'bg-white/20 border-white/30 text-white shadow-lg shadow-white/5'
												: 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200'}
										"
										onclick={() => {
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
							</div>

							<!-- Custom URL Input with improved styling -->
							{#if quickLinks[index].name === 'Other'}
								<div class="pt-1" transition:slide={{ duration: 200 }}>
									<div class="relative">
										<input
											type="url"
											bind:value={customUrls[index]}
											placeholder="https://example.com"
											class="w-full px-4 py-2.5 rounded-lg bg-white/5 text-gray-100 text-sm 
												border border-white/10 focus:border-white/30 
												focus:outline-none focus:ring-2 focus:ring-white/10
												placeholder:text-gray-500 transition-all"
											oninput={() => scheduleRowSave(index)}
										/>
										<div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
											🔗
										</div>
									</div>
								</div>
							{/if}

							<!-- Save Status with improved feedback -->
							<div class="min-h-[20px] flex items-center">
								{#if savingState[index]}
									<div class="flex items-center gap-1.5 text-xs text-gray-400">
										<span class="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
										<span>Saving changes...</span>
									</div>
								{:else if savedState[index]}
									<div class="flex items-center gap-1.5 text-xs text-green-400 animate-in fade-in duration-200">
										<span>✓</span>
										<span>Saved successfully</span>
									</div>
								{/if}
							</div>
						</section>
					{/each}
					<section class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="text-base">📌</span>
                            <h2 class="text-sm font-semibold text-gray-200 uppercase tracking-wide">Quick Panel</h2>
                        </div>

                        <div class="flex items-center justify-between">
                            <p class="text-sm text-gray-300">Keep the quick panel open</p>

                            <!-- simple switch -->
                            <button
                                onclick={toggleKeepQuickPanelOpen}
                                aria-pressed={appState.keepQuickPanelOpen}
                                aria-label="Toggle keep quick panel open"
                                class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none
                                    {appState.keepQuickPanelOpen ? 'bg-sky-500' : 'bg-white/5'}"
                            >
                                <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
                                    {appState.keepQuickPanelOpen ? 'translate-x-5' : 'translate-x-0'}"></span>
                            </button>
                        </div>
                    </section>
				</div>
			</div>
		</div>
	{/if}

    <!-- Enhanced Settings Button -->
    <button
        onclick={toggleSettingsView}
        aria-label="Settings (Alt+S)"
        title="Settings (Alt+S)"
        class="group relative rounded-lg p-2 border
           bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
           shadow-lg hover:shadow-xl transition-all duration-300
           hover:scale-110 active:scale-95
           {appState.settingsView 
				? 'border-sky-400 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 shadow-sky-400/20' 
				: 'border-slate-200 dark:border-slate-700 hover:border-sky-400'}"
    >
		<!-- Subtle glow effect when active -->
		{#if appState.settingsView}
			<div class="absolute inset-0 rounded-xl bg-sky-400/10 animate-pulse"></div>
		{/if}
        <span class="relative block text-base transition-transform duration-300 group-hover:rotate-90">⚙️</span>
    </button>
</div>

<style>
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.animate-spin {
		animation: spin 1s linear infinite;
	}

	.animate-in {
		animation: fade-in 0.2s ease-in;
	}
</style>
