<script lang="ts">
	import { onMount } from 'svelte'
	import { db, type QuickLink, getSetting, setSetting } from '$lib/utils/db'
	import { appState } from '$lib/state.svelte'
	import { quintOut } from 'svelte/easing'
	import { fly, slide } from 'svelte/transition'

	const defaultLinks: QuickLink[] = [
		{ category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
		{ category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
		{ category: 'OTT', name: 'Netflix', url: 'https://www.netflix.com' },
		{ category: 'AI', name: 'ChatGPT', url: 'https://chat.openai.com' },
		{ category: 'Social', name: 'X', url: 'https://x.com' },
		{ category: 'Custom', name: 'Techflix', url: 'https://techflix.club' },
	]

	const categoryConfigs = [
		{ 
			title: 'Email', 
			icon: '✉️',
			apps: ['Gmail', 'Outlook', 'Other'],
			urls: { Gmail: 'https://mail.google.com', Outlook: 'https://outlook.live.com' }
		},
		{ 
			title: 'Messaging', 
			icon: '💬',
			apps: ['WhatsApp', 'Telegram', 'Other'],
			urls: { WhatsApp: 'https://web.whatsapp.com', Telegram: 'https://web.telegram.org' }
		},
		{ 
			title: 'OTT', 
			icon: '📺',
			apps: ['Netflix', 'Prime', 'Other'],
			urls: { Netflix: 'https://www.netflix.com', Prime: 'https://www.primevideo.com' }
		},
		{ 
			title: 'AI', 
			icon: '🤖',
			apps: ['ChatGPT', 'Claude', 'Gemini', 'Other'],
			urls: { ChatGPT: 'https://chat.openai.com', Claude: 'https://claude.ai', Gemini: 'https://gemini.google.com' }
		},
		{ 
			title: 'Social', 
			icon: '🌐',
			apps: ['X', 'Instagram', 'Reddit', 'Other'],
			urls: { X: 'https://x.com', Instagram: 'https://www.instagram.com', Reddit: 'https://www.reddit.com' }
		},
		{ 
			title: 'Custom', 
			icon: '🔗',
			apps: ['Techflix', 'GitHub', 'Other'],
			urls: { Techflix: 'https://techflix.club', GitHub: 'https://github.com' }
		}
	]

	let quickLinks = $state(structuredClone(defaultLinks))
	let savingState = $state(Array(6).fill(false))
	let savedState = $state(Array(6).fill(false))
	let saveTimeouts = $state<(ReturnType<typeof setTimeout> | null)[]>(Array(6).fill(null))
	let customUrls = $state(Array(6).fill(''))

	const hasUnsavedChanges = $derived(savingState.some(Boolean) || savedState.some(Boolean))

	async function loadSettings() {
		// Load quick links
		for (let i = 0; i < categoryConfigs.length; i++) {
			const stored = await db.table('quicklinks')
				.where('category')
				.equals(categoryConfigs[i].title)
				.first()
			
			if (stored) {
				const predefinedApps = categoryConfigs[i].apps.filter(app => app !== 'Other')
				if (predefinedApps.includes(stored.name)) {
					quickLinks[i] = stored
					customUrls[i] = ''
				} else {
					quickLinks[i] = { ...stored, name: 'Other' }
					customUrls[i] = stored.url
				}
			}
		}

		// Load other settings with type safety and defaults
		appState.keepQuickPanelOpen = await getSetting('keepQuickPanelOpen', false)
		appState.showQuote = await getSetting('showQuote', true)
		appState.showWeather = await getSetting('showWeather', true)
	}

	onMount(loadSettings)

	async function saveRow(index: number) {
		savingState[index] = true
		savedState[index] = false

		const row = { ...quickLinks[index] }

		if (row.name === 'Other') {
			let trimmedUrl = customUrls[index]?.trim() || ''
			if (!trimmedUrl) {
				savingState[index] = false
				return
			}
			
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				trimmedUrl = 'https://' + trimmedUrl
			}
			
			row.url = trimmedUrl
		}

		try {
			const existing = await db.table('quicklinks')
				.where('category')
				.equals(row.category)
				.first()

			if (existing) {
				await db.table('quicklinks').update(existing.id!, row)
			} else {
				await db.table('quicklinks').add(row)
			}

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

	function toggleSettingsView() {
		appState.settingsView = !appState.settingsView
	}

	async function toggleKeepQuickPanelOpen() {
		const newVal = !appState.keepQuickPanelOpen
		await setSetting('keepQuickPanelOpen', newVal)
		appState.keepQuickPanelOpen = newVal
	}

	async function toggleWidget(widget: 'showQuote' | 'showWeather') {
		const newVal = !appState[widget]
		await setSetting(widget, newVal)
		appState[widget] = newVal
	}

	function selectApp(index: number, app: string) {
		const config = categoryConfigs[index]
		quickLinks[index] = { 
			...quickLinks[index], 
			name: app, 
			url: app === 'Other' ? (customUrls[index] || '') : (config.urls[app as keyof typeof config.urls] || '')
		}
		scheduleRowSave(index)
	}
</script>

<div class="fixed bottom-5 left-3 z-1000">
	{#if appState.settingsView}
		<div
			class="absolute bottom-full mb-3 w-[calc(100vw-2.5rem)] max-w-lg origin-bottom-left pl-4 pr-12"
			in:fly={{ y: 10, duration: 300, easing: quintOut }}
			out:slide={{ axis: 'y', duration: 200 }}
		>
			<div class="bg-slate-800 dark:bg-slate-950 rounded-2xl border border-slate-600 shadow-2xl overflow-hidden">
				<div class="relative bg-slate-800/80 dark:bg-slate-950 px-5 py-4 border-b border-slate-700">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<h1 class="text-lg font-semibold text-gray-100">Settings</h1>
							{#if hasUnsavedChanges}
								<div class="flex items-center gap-1.5 text-xs text-gray-400" transition:slide={{ duration: 250, axis: 'x' }}>
									{#if savingState.some(Boolean)}
										<span class="inline-block w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
										<span>Saving...</span>
									{:else if savedState.some(Boolean)}
										<span class="text-green-400">✓</span>
										<span class="text-green-400">Saved</span>
									{/if}
								</div>
							{/if}
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

				<div class="p-5 max-h-[70vh] overflow-y-auto space-y-3">
					{#each categoryConfigs as config, index}
						<section>
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2 min-w-30">
									<span class="text-base">{config.icon}</span>
									<h2 class="text-sm font-semibold text-gray-200 uppercase tracking-wide whitespace-nowrap">{config.title}</h2>
								</div>

								<div class="flex items-center gap-2">
									{#each config.apps as app}
										<button
											class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
												{quickLinks[index].name === app
													? 'bg-white/20 border border-white/30 text-white shadow-lg shadow-white/5'
													: 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200'}
											"
											onclick={() => selectApp(index, app)}
										>
											{app}
										</button>
									{/each}
								</div>
							</div>

							{#if quickLinks[index].name === 'Other'}
								<div class="pl-34 mt-2" transition:slide={{ duration: 200 }}>
									<div class="relative">
										<input
											type="url"
											bind:value={customUrls[index]}
											placeholder="https://example.com"
											class="w-full px-3 py-2 rounded-lg bg-white/5 text-gray-100 text-xs 
												border border-white/10 focus:border-white/30 
												focus:outline-none focus:ring-2 focus:ring-white/10
												placeholder:text-gray-500 transition-all"
											oninput={() => scheduleRowSave(index)}
										/>
										<div class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
											🔗
										</div>
									</div>
								</div>
							{/if}
						</section>
					{/each}

					<section class="pt-2 border-t border-slate-700">
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2 min-w-30">
								<span class="text-base">📌</span>
								<h2 class="text-sm font-semibold text-gray-200 uppercase tracking-wide whitespace-nowrap">Quick Panel</h2>
							</div>

							<div class="flex items-center gap-3">
								<p class="text-xs text-gray-300">Keep open</p>
								<button
									onclick={toggleKeepQuickPanelOpen}
									aria-pressed={appState.keepQuickPanelOpen}
									aria-label="Toggle keep quick panel open"
									class="relative inline-flex items-center h-5 rounded-full w-9 transition-colors duration-200 focus:outline-none
										{appState.keepQuickPanelOpen ? 'bg-sky-500' : 'bg-white/5'}"
								>
									<span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
										{appState.keepQuickPanelOpen ? 'translate-x-4' : 'translate-x-0'}"></span>
								</button>
							</div>
						</div>
					</section>

					<section class="pt-2 border-t border-slate-700">
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2 min-w-30">
								<span class="text-base">✨</span>
								<h2 class="text-sm font-semibold text-gray-200 uppercase tracking-wide whitespace-nowrap">Widgets</h2>
							</div>
							<div class="flex items-center gap-3">
								<p class="text-xs text-gray-300">Quote</p>
								<button
									onclick={() => toggleWidget('showQuote')}
									aria-pressed={appState.showQuote}
									aria-label="Toggle quote widget"
									class="relative inline-flex items-center h-5 rounded-full w-9 transition-colors duration-200 focus:outline-none
										{appState.showQuote ? 'bg-sky-500' : 'bg-white/5'}"
								>
									<span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
										{appState.showQuote ? 'translate-x-4' : 'translate-x-0'}"></span>
								</button>
							</div>
							<div class="flex items-center gap-3">
								<p class="text-xs text-gray-300">Weather</p>
								<button
									onclick={() => toggleWidget('showWeather')}
									aria-pressed={appState.showWeather}
									aria-label="Toggle weather widget"
									class="relative inline-flex items-center h-5 rounded-full w-9 transition-colors duration-200 focus:outline-none
										{appState.showWeather ? 'bg-sky-500' : 'bg-white/5'}"
								>
									<span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
										{appState.showWeather ? 'translate-x-4' : 'translate-x-0'}"></span>
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	{/if}

	<button
		onclick={toggleSettingsView}
		aria-label="Settings (Alt + S)"
		data-tooltip="Settings (Alt + S)" data-tooltip-position="right" 
		class="group relative rounded-lg p-2 border
		   bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300
		   shadow-lg hover:shadow-xl transition-all duration-300
		   hover:scale-110 active:scale-95
		   {appState.settingsView 
				? 'border-sky-400 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 shadow-sky-400/20' 
				: 'border-slate-200 dark:border-slate-700 hover:border-sky-400'}"
	>
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
</style>
