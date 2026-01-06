<script lang="ts">
    let { gameState, score, highScore, togglePause } = $props()
</script>

<div class="flex items-center justify-between px-2">
    <h1 class="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-500">
        Quantum Dino
    </h1>
    
    <div class="flex items-center gap-4 md:gap-8">
        <button 
            class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg border border-slate-600 text-sm font-bold transition-colors"
            onclick={togglePause}
        >
            {gameState === 'paused' ? 'RESUME' : 'PAUSE'}
        </button>
        <div class="text-right">
            <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Score</div>
            <div class="text-lg md:text-xl font-black text-cyan-400 font-mono">{Math.floor(score)}</div>
        </div>
        <div class="text-right">
            <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Best</div>
            <div class="text-lg md:text-xl font-black text-purple-400 font-mono">{highScore}</div>
        </div>
    </div>
</div>
