<script lang="ts">
    import { fade, scale } from 'svelte/transition'
    let { gameState, score, startGame, togglePause }: { gameState: 'start' | 'playing' | 'paused' | 'gameOver', score: number, startGame: () => void, togglePause: () => void } = $props()
</script>

{#if gameState !== 'playing'}
    <div 
        class="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 text-center"
        transition:fade={{ duration: 200 }}
    >
        <div class="space-y-4 sm:space-y-6 md:space-y-8 max-w-lg w-full">
            {#if gameState === 'start'}
                <div in:scale>
                    <div class="text-5xl sm:text-6xl md:text-8xl mb-3 sm:mb-4 animate-bounce">🦖</div>
                    <h2 class="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-2 leading-tight">Ready?</h2>
                    <p class="text-slate-400 text-xs sm:text-sm md:text-base px-2">Tap / Click / Press Space to Jump</p>
                </div>
                <button 
                    class="px-6 py-2.5 sm:px-8 sm:py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-cyan-600 active:to-blue-700 text-white text-sm sm:text-base font-bold rounded-full shadow-lg shadow-cyan-500/20 transform hover:scale-105 active:scale-95 transition-all w-full sm:w-auto max-w-xs mx-auto"
                    onclick={startGame}
                >
                    START RUNNING
                </button>
            {:else if gameState === 'paused'}
                <div in:scale>
                    <h2 class="text-3xl sm:text-4xl font-black text-slate-200 mb-2">PAUSED</h2>
                </div>
                <button 
                    class="px-6 py-2.5 sm:px-8 sm:py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-sm sm:text-base font-bold rounded-full border border-slate-500 w-full sm:w-auto max-w-xs mx-auto transition-colors"
                    onclick={togglePause}
                >
                    RESUME
                </button>
            {:else if gameState === 'gameOver'}
                <div in:scale>
                    <div class="text-5xl sm:text-6xl md:text-8xl mb-3 sm:mb-4">💀</div>
                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-red-500 mb-2 leading-tight">Wasted</h2>
                    <p class="text-xl sm:text-2xl font-bold text-white">Score: {Math.floor(score)}</p>
                </div>
                <button 
                    class="px-6 py-2.5 sm:px-8 sm:py-3 bg-linear-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 active:from-red-600 active:to-orange-700 text-white text-sm sm:text-base font-bold rounded-full shadow-lg shadow-red-500/20 transform hover:scale-105 active:scale-95 transition-all w-full sm:w-auto max-w-xs mx-auto"
                    onclick={startGame}
                >
                    TRY AGAIN
                </button>
            {/if}
        </div>
    </div>
{/if}
