<script lang="ts">
    import { tick } from 'svelte'
    import { fade, fly } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'
    import { appState } from '$lib/state.svelte'
    import { CloseButton, ModeControl } from './shared'
    import { applyThemePreset, closeThemeDesigner, resetTheme, setTheme } from '$lib/stores/theme'
    import {
        ACCENT_SWATCHES,
        FONT_OPTIONS,
        FONT_STACKS,
        SEED_SWATCHES,
        SURFACE_OPTIONS,
        THEME_PRESETS,
        activePresetId,
        buildPalette,
        presetToTheme,
        textContrast,
        type ThemePreset,
    } from '$lib/utils/theme'

    let panelEl = $state<HTMLElement | undefined>(undefined)
    let restoreFocusTo: HTMLElement | null = null

    const theme = $derived(appState.theme)
    const activePreset = $derived(activePresetId(theme))
    const contrast = $derived(textContrast(theme, appState.themeResolved))
    const lowContrast = $derived(contrast < 4.5)

    $effect(() => {
        if (!appState.themeDesignerOpen) return
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            restoreFocusTo = document.activeElement
        }
        void tick().then(() => panelEl?.focus())
        return () => restoreFocusTo?.focus()
    })

    function preview(preset: ThemePreset) {
        const config = presetToTheme(preset, 'light')
        return { light: buildPalette(config, 'light'), dark: buildPalette(config, 'dark') }
    }

    function onWindowKeydown(event: KeyboardEvent) {
        if (!appState.themeDesignerOpen) return
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            closeThemeDesigner()
            return
        }
        if (event.key !== 'Tab') return
        const focusables = panelEl?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (event.shiftKey && (active === first || active === panelEl)) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && active === last) {
            event.preventDefault()
            first.focus()
        }
    }
</script>

{#snippet previewCard()}
    <div class="rounded-2xl border border-line bg-bg p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Preview</p>
        <p class="mt-2 text-sm font-semibold text-fg">Focus on what matters</p>
        <p class="mt-1 text-xs text-fg-muted">A calmer place to plan your day.</p>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <span class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-sm">Start</span>
            <span class="rounded-md bg-accent-soft px-2 py-1 text-[10px] text-accent-text">Accent</span>
            <span class="rounded-md bg-success-soft px-2 py-1 text-[10px] text-success">Done</span>
            <span class="rounded-md bg-danger-soft px-2 py-1 text-[10px] text-danger">Danger</span>
        </div>
        <div class="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            <span class="text-[10px] text-fg-subtle">{appState.themeResolved} mode</span>
            <span class={`text-[10px] ${lowContrast ? 'text-warning' : 'text-fg-subtle'}`}>
                {lowContrast ? `Low contrast (${contrast.toFixed(1)}:1)` : `Contrast ${contrast.toFixed(1)}:1`}
            </span>
        </div>
    </div>
{/snippet}

{#snippet colorRow(label: string, value: string, swatches: string[], onPick: (color: string) => void)}
    <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span class="w-12 shrink-0 text-xs text-fg-muted">{label}</span>
        <label
            class="flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5 transition-colors hover:bg-surface-2/60 focus-within:ring-2 focus-within:ring-accent-text"
            title={`Pick a ${label.toLowerCase()} colour`}
        >
            <span class="h-7 w-7 rounded-full border border-line-strong shadow-sm" style:background={value}></span>
            <span class="font-mono text-[11px] tabular-nums text-fg-subtle">{value}</span>
            <input
                type="color"
                class="sr-only"
                {value}
                aria-label={`${label} colour`}
                oninput={(event) => onPick(event.currentTarget.value)}
            />
        </label>
        <div class="flex flex-wrap items-center gap-1.5">
            {#each swatches as color (color)}
                <button
                    type="button"
                    class={`h-6 w-6 rounded-full transition hover:scale-110 ${
                        value === color ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : 'ring-1 ring-black/10'
                    }`}
                    style:background={color}
                    aria-label={`${label} colour ${color}`}
                    aria-pressed={value === color}
                    onclick={() => onPick(color)}
                ></button>
            {/each}
        </div>
    </div>
{/snippet}

<svelte:window onkeydown={onWindowKeydown} />

{#if appState.themeDesignerOpen}
    <div class="fixed inset-0 z-[1150] flex items-end justify-center sm:items-center sm:p-6">
        <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm"
            transition:fade={{ duration: 150 }}
            onclick={closeThemeDesigner}
            role="presentation"
        ></div>

        <div
            bind:this={panelEl}
            class="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl"
            in:fly={{ y: 24, duration: 260, easing: cubicOut }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-designer-title"
            tabindex="-1"
            data-shortcut-blocker
        >
            <header
                class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur sm:px-5"
            >
                <h1 id="theme-designer-title" class="text-base font-semibold text-fg">Theme designer</h1>
                <div class="ml-auto flex items-center gap-2">
                    <ModeControl size="sm" />
                    <CloseButton label="Close theme designer" onclick={closeThemeDesigner} />
                </div>
            </header>

            <div class="flex min-h-0 flex-1">
                <div class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pt-5">
                    <div
                        class="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg px-3 py-2 lg:hidden"
                    >
                        <div class="min-w-0">
                            <p class="truncate text-xs font-semibold text-fg">Focus on what matters</p>
                            <p class={`truncate text-[10px] ${lowContrast ? 'text-warning' : 'text-fg-subtle'}`}>
                                {appState.themeResolved} mode ·
                                {lowContrast
                                    ? `low contrast (${contrast.toFixed(1)}:1)`
                                    : `contrast ${contrast.toFixed(1)}:1`}
                            </p>
                        </div>
                        <span
                            class="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg"
                        >
                            Start
                        </span>
                    </div>

                    <section>
                        <h2 class="text-xs font-semibold uppercase tracking-wide text-fg-muted">Presets</h2>
                        <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {#each THEME_PRESETS as preset (preset.id)}
                                {@const colors = preview(preset)}
                                <button
                                    type="button"
                                    class={`group flex flex-col gap-1.5 rounded-xl border p-2 text-left transition active:scale-[0.98] ${
                                        activePreset === preset.id
                                            ? 'border-accent ring-2 ring-accent/30'
                                            : 'border-line hover:border-line-strong'
                                    }`}
                                    aria-pressed={activePreset === preset.id}
                                    title={preset.description}
                                    onclick={() => applyThemePreset(preset.id)}
                                >
                                    <span class="flex h-8 overflow-hidden rounded-md border border-line/60">
                                        <span
                                            class="flex flex-1 items-center justify-center"
                                            style:background={colors.light.bg}
                                        >
                                            <span
                                                class="h-2.5 w-2.5 rounded-full"
                                                style:background={colors.light.accent}
                                            ></span>
                                        </span>
                                        <span
                                            class="flex flex-1 items-center justify-center"
                                            style:background={colors.dark.bg}
                                        >
                                            <span class="h-2.5 w-2.5 rounded-full" style:background={colors.dark.accent}
                                            ></span>
                                        </span>
                                    </span>
                                    <span class="flex items-center justify-between gap-1">
                                        <span
                                            class="truncate text-[11px] font-semibold text-fg"
                                            style:font-family={FONT_STACKS[preset.font]}
                                        >
                                            {preset.name}
                                        </span>
                                        {#if activePreset === preset.id}
                                            <span class="text-accent-text" aria-hidden="true">✓</span>
                                        {/if}
                                    </span>
                                </button>
                            {/each}
                        </div>
                    </section>

                    <section class="border-t border-line pt-4">
                        <h2 class="text-xs font-semibold uppercase tracking-wide text-fg-muted">Colours</h2>
                        <div class="mt-2 space-y-2.5">
                            {@render colorRow('Base', theme.seed, SEED_SWATCHES, (color) => setTheme({ seed: color }))}
                            {@render colorRow('Accent', theme.accent, ACCENT_SWATCHES, (color) =>
                                setTheme({ accent: color })
                            )}
                        </div>
                    </section>

                    <section class="grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
                        <div class="space-y-4">
                            <div>
                                <div class="flex items-center justify-between gap-2">
                                    <label for="theme-radius" class="text-xs font-medium text-fg-muted">Corners</label>
                                    <span class="text-[11px] tabular-nums text-fg-subtle">{theme.radius}px</span>
                                </div>
                                <input
                                    id="theme-radius"
                                    type="range"
                                    min="0"
                                    max="24"
                                    step="1"
                                    value={theme.radius}
                                    aria-label="Corner radius"
                                    class="mt-2 w-full accent-accent"
                                    oninput={(event) => setTheme({ radius: Number(event.currentTarget.value) })}
                                />
                            </div>
                            <div>
                                <div class="flex items-center justify-between gap-2">
                                    <label for="theme-vibrancy" class="text-xs font-medium text-fg-muted"
                                        >Vibrancy</label
                                    >
                                    <span class="text-[11px] tabular-nums text-fg-subtle">{theme.vibrancy}%</span>
                                </div>
                                <input
                                    id="theme-vibrancy"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={theme.vibrancy}
                                    aria-label="Colour vibrancy"
                                    class="mt-2 w-full accent-accent"
                                    oninput={(event) => setTheme({ vibrancy: Number(event.currentTarget.value) })}
                                />
                            </div>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <h3 class="text-xs font-medium text-fg-muted">Typeface</h3>
                                <div class="mt-1.5 grid grid-cols-4 gap-1.5">
                                    {#each FONT_OPTIONS as option (option.id)}
                                        <button
                                            type="button"
                                            class={`rounded-lg border px-1 py-1.5 text-center transition ${
                                                theme.font === option.id
                                                    ? 'border-accent bg-accent-soft text-fg'
                                                    : 'border-line text-fg-muted hover:text-fg'
                                            }`}
                                            aria-pressed={theme.font === option.id}
                                            onclick={() => setTheme({ font: option.id })}
                                        >
                                            <span
                                                class="block text-base leading-none"
                                                style:font-family={FONT_STACKS[option.id]}
                                            >
                                                {option.sample}
                                            </span>
                                            <span class="mt-1 block text-[10px] font-medium">{option.label}</span>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                            <div>
                                <h3 class="text-xs font-medium text-fg-muted">Surface</h3>
                                <div class="mt-1.5 grid grid-cols-2 gap-1.5">
                                    {#each SURFACE_OPTIONS as option (option.id)}
                                        <button
                                            type="button"
                                            class={`rounded-lg border px-2 py-1.5 text-left transition ${
                                                theme.surface === option.id
                                                    ? 'border-accent bg-accent-soft text-fg'
                                                    : 'border-line text-fg-muted hover:text-fg'
                                            }`}
                                            aria-pressed={theme.surface === option.id}
                                            title={option.description}
                                            onclick={() => setTheme({ surface: option.id })}
                                        >
                                            <span class="block text-[11px] font-semibold">{option.label}</span>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <aside class="hidden w-72 shrink-0 flex-col gap-3 border-l border-line bg-surface/40 p-4 lg:flex">
                    {@render previewCard()}
                </aside>
            </div>

            <footer class="flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3 sm:px-5">
                <span class="text-[11px] text-fg-subtle">Saved automatically</span>
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        class="rounded-lg border border-line px-3 py-2 text-xs font-medium text-fg-muted transition hover:border-line-strong hover:text-fg active:scale-95"
                        onclick={resetTheme}
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        class="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-sm transition hover:bg-accent-strong active:scale-95"
                        onclick={closeThemeDesigner}
                    >
                        Done
                    </button>
                </div>
            </footer>
        </div>
    </div>
{/if}
