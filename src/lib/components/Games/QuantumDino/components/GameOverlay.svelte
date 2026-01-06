<script lang="ts">
    import { fade, scale } from 'svelte/transition'
    let { gameState, score, startGame, togglePause }: { gameState: 'start' | 'playing' | 'paused' | 'gameOver', score: number, startGame: () => void, togglePause: () => void } = $props()
</script>

{#if gameState !== 'playing'}
    <div 
        class="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-6 text-center"
        transition:fade={{ duration: 200 }}
    >
        <div class="space-y-6 md:space-y-8 max-w-lg">
            {#if gameState === 'start'}
                <div in:scale>
                    <div class="text-6xl md:text-8xl mb-4 animate-bounce">🦖</div>
                    <h2 class="text-3xl md:text-5xl font-black text-white mb-2">Ready?</h2>
                    <p class="text-slate-400 text-sm md:text-base">Tap / Click / Press Space to Jump</p>
                </div>
                <button 
                    class="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-full shadow-lg shadow-cyan-500/20 transform hover:scale-105 transition-all"
                    onclick={startGame}
                >
                    START RUNNING
                </button>
            {:else if gameState === 'paused'}
                <div in:scale>
                    <h2 class="text-4xl font-black text-slate-200 mb-2">PAUSED</h2>
                </div>
                <button 
                    class="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full border border-slate-500"
                    onclick={togglePause}
                >
                    RESUME
                </button>
            {:else if gameState === 'gameOver'}
                <div in:scale>
                    <div class="text-6xl md:text-8xl mb-4">💀</div>
                    <h2 class="text-4xl md:text-5xl font-black text-red-500 mb-2">Wasted</h2>
                    <p class="text-2xl font-bold text-white">Score: {Math.floor(score)}</p>
                </div>
                <button 
                    class="px-8 py-3 bg-linear-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white font-bold rounded-full shadow-lg shadow-red-500/20 transform hover:scale-105 transition-all"
                    onclick={startGame}
                >
                    TRY AGAIN
                </button>
            {/if}
        </div>
    </div>
{/if}
