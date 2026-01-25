<script lang="ts">
    import { fade } from "svelte/transition"
    let {
        gameState, 
        health, 
        dino, 
        gameSpeed, 
        QUANTUM_DURATION 
    }: { gameState: 'start' | 'playing' | 'paused' | 'gameOver', health: number, dino: any, gameSpeed: number, QUANTUM_DURATION: number } = $props()
    
</script>
{#if gameState === 'playing' || gameState === 'paused'}
    <div class="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex flex-col xs:flex-row justify-between items-start xs:items-start gap-2 pointer-events-none" transition:fade>
        
        <!-- Health Bar -->
        <div class="bg-slate-900/80 backdrop-blur rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 border border-slate-700 shadow-lg w-full xs:w-auto">
            <div class="flex items-center gap-1.5 sm:gap-2 mb-1">
                <span class="text-[10px] sm:text-xs font-bold text-slate-300">HP</span>
                <span class="text-[10px] sm:text-xs font-mono text-slate-400">{Math.ceil(health)}%</span>
            </div>
            <div class="w-full xs:w-28 sm:w-32 md:w-48 h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                <div 
                    class="h-full transition-all duration-300 rounded-full"
                    class:bg-emerald-500={health > 50}
                    class:bg-amber-500={health <= 50 && health > 25}
                    class:bg-red-600={health <= 25}
                    style:width="{health}%"
                ></div>
            </div>
        </div>

        <!-- Quantum/Speed Indicator -->
        <div class="flex flex-col items-end gap-2 w-full xs:w-auto">
            {#if dino.isQuantum}
                <div class="bg-cyan-900/90 backdrop-blur rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] w-full xs:w-auto">
                    <div class="text-[10px] sm:text-xs font-bold text-cyan-200 mb-1">⚛️ QUANTUM</div>
                    <div class="w-full xs:w-20 sm:w-24 h-1.5 sm:h-2 bg-cyan-950 rounded-full overflow-hidden">
                        <div 
                            class="h-full bg-linear-to-r from-cyan-300 to-white"
                            style:width="{(dino.quantumTimer / QUANTUM_DURATION) * 100}%"
                        ></div>
                    </div>
                </div>
            {:else}
                <div class="bg-slate-900/80 backdrop-blur rounded-lg px-2 py-1 sm:px-3 sm:py-1 border border-slate-700">
                    <span class="text-[9px] sm:text-[10px] font-bold text-slate-500">SPEED {gameSpeed.toFixed(1)}x</span>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @media (min-width: 475px) {
        .xs\:flex-row { flex-direction: row; }
        .xs\:w-28 { width: 7rem; }
        .xs\:w-20 { width: 5rem; }
        .xs\:w-auto { width: auto; }
        .xs\:items-start { align-items: flex-start; }
    }
</style>
