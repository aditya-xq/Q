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
    <div class="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none" transition:fade>
        
        <div class="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 border border-slate-700 shadow-lg">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-300">HP</span>
                <span class="text-xs font-mono text-slate-400">{Math.ceil(health)}%</span>
            </div>
            <div class="w-32 md:w-48 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                <div 
                    class="h-full transition-all duration-300 rounded-full"
                    class:bg-emerald-500={health > 50}
                    class:bg-amber-500={health <= 50 && health > 25}
                    class:bg-red-600={health <= 25}
                    style:width="{health}%"
                ></div>
            </div>
        </div>

        <div class="flex flex-col items-end gap-2">
                {#if dino.isQuantum}
                <div class="bg-cyan-900/90 backdrop-blur rounded-lg px-3 py-2 border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <div class="text-xs font-bold text-cyan-200 mb-1">⚛️ QUANTUM</div>
                    <div class="w-24 h-2 bg-cyan-950 rounded-full overflow-hidden">
                        <div 
                            class="h-full bg-linear-to-r from-cyan-300 to-white"
                            style:width="{(dino.quantumTimer / QUANTUM_DURATION) * 100}%"
                        ></div>
                    </div>
                </div>
            {:else}
                <div class="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1 border border-slate-700">
                    <span class="text-[10px] font-bold text-slate-500">SPEED {gameSpeed.toFixed(1)}x</span>
                </div>
            {/if}
        </div>
    </div>
{/if}
