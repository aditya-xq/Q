<script lang="ts">
	import { fly, fade, scale } from 'svelte/transition'
	import { quintOut, backOut } from 'svelte/easing'
    import { gameStore } from './state.svelte'
    import QuantumDino from './QuantumDino/QuantumDino.svelte'
    import { onDestroy } from 'svelte'

	// Game store interface
	interface GameStore {
		QuantumDino: boolean
	}

	// Game metadata
	interface GameMetadata {
		id: keyof GameStore
		title: string
		emoji: string
		description: string
		gradient: string
		accentColor: string
		tags: string[]
	}

	const games: GameMetadata[] = [
		{
			id: 'QuantumDino',
			title: 'Quantum Dino',
			emoji: '🦖',
			description: 'Jump through obstacles and collect quantum power-ups to phase through reality!',
			gradient: 'from-cyan-500 via-purple-500 to-pink-500',
			accentColor: 'cyan',
			tags: ['Arcade', 'Physics', 'Endless']
		}
		// Add more games here
	]

	const accentColors = {
		cyan: {
			bg: 'bg-cyan-500',
			text: 'text-cyan-400',
			border: 'border-cyan-500',
			shadow: 'shadow-cyan-500/20',
			glow: 'shadow-cyan-400/30'
		},
		purple: {
			bg: 'bg-purple-500',
			text: 'text-purple-400',
			border: 'border-purple-500',
			shadow: 'shadow-purple-500/20',
			glow: 'shadow-purple-400/30'
		},
		green: {
			bg: 'bg-green-500',
			text: 'text-green-400',
			border: 'border-green-500',
			shadow: 'shadow-green-500/20',
			glow: 'shadow-green-400/30'
		},
		orange: {
			bg: 'bg-orange-500',
			text: 'text-orange-400',
			border: 'border-orange-500',
			shadow: 'shadow-orange-500/20',
			glow: 'shadow-orange-400/30'
		}
	}

	function launchGame(gameId: keyof GameStore) {
		// Reset all games
		Object.keys(gameStore).forEach(key => {
			gameStore[key as keyof GameStore] = false
		})
		// Launch selected game
		gameStore[gameId] = true
	}

	function closeGame() {
		// Reset all games
		Object.keys(gameStore).forEach(key => {
			gameStore[key as keyof GameStore] = false
		})
	}

	// Check if any game is active
	const activeGame = $derived(
		Object.entries(gameStore).find(([_, isActive]) => isActive)?.[0] as keyof GameStore | undefined
	)

	const isAnyGameActive = $derived(Object.values(gameStore).some(v => v))

    onDestroy(closeGame)
</script>

{#if !isAnyGameActive}
	<!-- Game Dashboard -->
	<div in:fade={{ duration: 300 }}>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<header class="mb-6 sm:mb-8 text-center" in:fly={{ y: -30, duration: 600, delay: 100, easing: quintOut }}>
				<div class="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
					<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
						<span class="text-2xl sm:text-3xl">🎮</span>
					</div>
					<div class="flex flex-col items-center sm:items-start">
						<h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400">
							Arcade
						</h1>
						<p class="text-slate-400 text-sm sm:text-base lg:text-lg font-medium">Choose your adventure</p>
					</div>
				</div>
			</header>

			<!-- Games Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
				{#each games as game, index}
					<button
						onclick={() => launchGame(game.id)}
						class="group relative bg-slate-800/40 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/60 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-slate-600 active:scale-[0.98]"
						in:fly={{ y: 30, duration: 500, delay: 300 + index * 100, easing: quintOut }}
					>
						<!-- Gradient Overlay -->
						<div class="absolute inset-0 bg-linear-to-br {game.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
						
						<!-- Glow Effect -->
						<div class="absolute -inset-1 bg-linear-to-br {game.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>

						<div class="relative p-4 sm:p-6">
							<!-- Game Icon -->
							<div class="mb-3 sm:mb-4 flex items-center justify-between">
								<div class="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-linear-to-br {game.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl {accentColors[game.accentColor as keyof typeof accentColors].glow} transition-all duration-300 group-hover:scale-110">
									<span class="text-2xl sm:text-4xl">{game.emoji}</span>
								</div>
								<div class="flex flex-col gap-1">
									<div class="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</div>
									<div class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5">
										<span class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400 animate-pulse"></span>
										<span>Ready</span>
									</div>
								</div>
							</div>

							<!-- Game Info -->
							<h2 class="text-xl sm:text-2xl font-black text-slate-100 mb-1.5 sm:mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:{game.gradient} transition-all duration-300">
								{game.title}
							</h2>
							<p class="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 leading-relaxed line-clamp-2 sm:line-clamp-none">
								{game.description}
							</p>

							<!-- Tags -->
							<div class="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
								{#each game.tags as tag}
									<span class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-700/50 border border-slate-600/50 text-[10px] sm:text-xs font-semibold text-slate-300">
										{tag}
									</span>
								{/each}
							</div>

							<!-- Play Button -->
							<div class="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-700/60">
								<div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold {accentColors[game.accentColor as keyof typeof accentColors].text}">
									<span>▶</span>
									<span>Launch Game</span>
								</div>
								<div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-700/50 flex items-center justify-center group-hover:bg-linear-to-br group-hover:{game.gradient} transition-all duration-300">
									<span class="text-slate-400 group-hover:text-white transition-colors text-sm sm:text-base">→</span>
								</div>
							</div>
						</div>
					</button>
				{/each}

				<!-- Coming Soon Card -->
				<div
					class="relative bg-slate-800/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-700/60 overflow-hidden"
					in:fly={{ y: 30, duration: 500, delay: 300 + games.length * 100, easing: quintOut }}
				>
					<div class="relative p-4 sm:p-6 h-full flex flex-col items-center justify-center text-center min-h-50 sm:min-h-0">
						<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-700/30 flex items-center justify-center mb-3 sm:mb-4">
							<span class="text-3xl sm:text-4xl">✨</span>
						</div>
						<h2 class="text-lg sm:text-xl font-black text-slate-500 mb-1.5 sm:mb-2">More Games Coming Soon</h2>
						<p class="text-xs sm:text-sm text-slate-600">
							Stay tuned for new adventures
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Active Game View -->
    <button
        onclick={closeGame}
        class="fixed top-4 left-20 z-50 group bg-slate-900/90 backdrop-blur-lg rounded-xl px-4 py-2.5 border border-slate-700/60 shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all duration-300 hover:scale-105 active:scale-95"
        in:fly={{ x: -30, duration: 400, delay: 200 }}
    >
        <div class="flex items-center gap-2">
            <span class="text-slate-400 group-hover:text-slate-200 transition-colors">←</span>
            <span class="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">Back to Arcade</span>
        </div>
    </button>
	<div in:scale={{ duration: 400, easing: backOut }}>
		{#if activeGame === 'QuantumDino'}
			<QuantumDino />
		{/if}
	</div>
{/if}

<style>
</style>
