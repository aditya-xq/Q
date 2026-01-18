<script lang="ts">
    import { fly, fade } from 'svelte/transition'
    import { quintOut } from 'svelte/easing'
</script>

<div in:fade={{ duration: 300 }} class="selection:bg-emerald-400 selection:text-emerald-950">
    <div class="max-w-5xl mx-auto pr-14 pt-16 sm:pt-0">
        <header class="mb-8 md:mb-12 text-center" in:fly={{ y: -30, duration: 600, delay: 100, easing: quintOut }}>
            <div class="flex flex-col md:flex-row items-center justify-center md:inline-flex gap-4 mb-3">
                <div class="w-16 h-16 hidden rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 sm:flex items-center justify-center shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/30 shrink-0">
                    <span class="text-4xl">🔥</span>
                </div>
                <div class="text-center md:text-left">
                    <h1 class="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Fortuna: A FIREbound Odyssey
                    </h1>
                    <p class="text-slate-600 dark:text-slate-400 text-base md:text-lg font-normal pt-2">Manage your wealth, expenses, and investments in a unique gamified experience.</p>
                </div>
            </div>
        </header>

        <div class="flex items-center justify-center">
            <div
                class="relative rounded-lg overflow-hidden w-full border border-slate-200 dark:border-slate-700"
                in:fly={{ y: 30, duration: 500, delay: 300, easing: quintOut }}
            >
                <div class="h-1 bg-linear-to-r from-emerald-500 to-emerald-600"></div>
                
                <div class="relative p-6 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    
                    <div class="shrink-0 flex flex-col items-center space-y-6">
                        <div class="relative">
                            <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                <span class="text-5xl md:text-6xl">🎮</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 w-10 h-10 md:w-12 md:h-12 rounded-full bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg animate-pulse">
                                <span class="text-xl md:text-2xl">✨</span>
                            </div>
                        </div>
                        
                        <div class="flex flex-col items-center gap-3">
                            <div class="flex gap-2">
                                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style="animation-delay: 0.2s;"></div>
                                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style="animation-delay: 0.4s;"></div>
                            </div>
                            <span class="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">Launching Soon</span>
                        </div>
                    </div>

                    <div class="flex-1 space-y-8 text-center md:text-left">
                        <div class="space-y-4">
                            <h2 class="text-2xl md:text-4xl font-semibold text-emerald-500">
                                Your FIRE Journey, Gamified
                            </h2>
                            <p class="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto md:mx-0">
                                A privacy-first, idle-RPG that turns your path to Financial Independence into an epic quest. No logins, no data leaks! All progress stored locally in your browser. Track your wealth, level up your strategy, and retire early like a hero.
                            </p>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div class="space-y-2 flex flex-col items-center md:items-start">
                                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                    <span class="text-2xl">🔒</span>
                                </div>
                                <div>
                                    <p class="text-base md:text-lg font-medium text-slate-900 dark:text-white">Privacy First</p>
                                    <p class="text-sm md:text-base text-slate-500 dark:text-slate-500 mt-1">Local storage only</p>
                                </div>
                            </div>
                            <div class="space-y-2 flex flex-col items-center md:items-start">
                                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                    <span class="text-2xl">⚔️</span>
                                </div>
                                <div>
                                    <p class="text-base md:text-lg font-medium text-slate-900 dark:text-white">Idle RPG</p>
                                    <p class="text-sm md:text-base text-slate-500 dark:text-slate-500 mt-1">Progress passively</p>
                                </div>
                            </div>
                            <div class="space-y-2 flex flex-col items-center md:items-start">
                                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                    <span class="text-2xl">📊</span>
                                </div>
                                <div>
                                    <p class="text-base md:text-lg font-medium text-slate-900 dark:text-white">Track Wealth</p>
                                    <p class="text-sm md:text-base text-slate-500 dark:text-slate-500 mt-1">Monitor portfolio</p>
                                </div>
                            </div>
                            <div class="space-y-2 flex flex-col items-center md:items-start">
                                <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                    <span class="text-2xl">🎯</span>
                                </div>
                                <div>
                                    <p class="text-base md:text-lg font-medium text-slate-900 dark:text-white">Epic Quests</p>
                                    <p class="text-sm md:text-base text-slate-500 dark:text-slate-500 mt-1">Achieve FIRE goals</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
</style>
