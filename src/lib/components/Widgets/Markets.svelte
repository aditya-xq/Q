<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import {
        MARKET_REGIONS,
        MARKET_STATUS_LABELS,
        MAX_MARKET_SYMBOLS,
        TRADINGVIEW_SCAN_ENDPOINT,
        buildMarketAriaLabel,
        buildMarketQuoteUrl,
        buildMarketQuotes,
        buildTradingViewBody,
        getMarketProvider,
        getMarketWatchlist,
        getRegionLabel,
        hasDefaultWatchlist,
        isMarketRegion,
        parseCnbcQuotes,
        parseCustomSymbols,
        parseTradingViewQuotes,
        resolveMarketInstrument,
        resolveMarketRegion,
        type MarketInstrument,
        type MarketQuote,
        type MarketRegion,
        type MarketTone,
    } from '$lib/utils/markets'
    import { setSetting } from '$lib/utils/db'
    import { onDestroy, tick } from 'svelte'
    import { fly, slide } from 'svelte/transition'
    import { cubicOut } from 'svelte/easing'

    const CACHE_KEY = 'markets:quotes:v5'
    const CACHE_TTL = 5 * 60 * 1000
    const REFRESH_INTERVAL = 5 * 60 * 1000
    const FETCH_TIMEOUT_MS = 15 * 1000

    let quotes = $state<MarketQuote[]>([])
    let updatedAt = $state<Date | null>(null)
    let loading = $state(false)
    let failed = $state(false)
    let configOpen = $state(false)
    let configEl = $state<HTMLElement | undefined>(undefined)
    let configButton = $state<HTMLButtonElement | undefined>(undefined)
    let symbolsDraft = $state('')
    let configSaved = $state(false)
    let symbolSaveTimer: ReturnType<typeof setTimeout> | undefined
    let configSavedTimer: ReturnType<typeof setTimeout> | undefined

    // Plain counters, not runes: reading them inside the fetch effect must not
    // retrigger it whenever a quote arrives.
    let loadedKey = ''
    let fetchGeneration = 0
    let refreshController: AbortController | null = null

    const autoRegion = resolveMarketRegion({
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: typeof navigator === 'undefined' ? undefined : navigator.language,
    })

    const selectedRegion = $derived(
        appState.marketsRegion === 'auto' || isMarketRegion(appState.marketsRegion) ? appState.marketsRegion : 'auto'
    )
    const region: MarketRegion = $derived(selectedRegion === 'auto' ? autoRegion : (selectedRegion as MarketRegion))
    const customSymbols = $derived(parseCustomSymbols(appState.marketSymbols))
    const regionDefaults = $derived(getMarketWatchlist(region))
    const watchlist = $derived(getMarketWatchlist(region, customSymbols))
    const watchlistKey = $derived(watchlist.join('|'))

    function readCache(key: string): { quotes: MarketQuote[]; ts: number } | null {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY)
            if (!raw) return null
            const parsed = JSON.parse(raw) as { key?: unknown; ts?: unknown; quotes?: unknown }
            if (parsed.key !== key || typeof parsed.ts !== 'number' || !Array.isArray(parsed.quotes)) return null
            return { quotes: parsed.quotes as MarketQuote[], ts: parsed.ts }
        } catch {
            return null
        }
    }

    function writeCache(key: string, rows: MarketQuote[]) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key, ts: Date.now(), quotes: rows }))
        } catch {
            /* storage unavailable (private mode / quota) */
        }
    }

    /** Loads cached rows for this watchlist and reports whether they are still fresh. */
    function hydrate(key: string): boolean {
        if (loadedKey === key) return true
        loadedKey = key
        // A new watchlist invalidates any response that is still in flight.
        fetchGeneration += 1
        loading = false
        failed = false
        const cached = readCache(key)
        if (!cached) {
            quotes = []
            updatedAt = null
            return false
        }
        quotes = cached.quotes
        updatedAt = new Date(cached.ts)
        return Date.now() - cached.ts < CACHE_TTL
    }

    async function requestCnbcQuotes(instruments: MarketInstrument[], signal: AbortSignal): Promise<MarketQuote[]> {
        const response = await fetch(buildMarketQuoteUrl(instruments.map((instrument) => instrument.symbol)), {
            signal,
        })
        if (!response.ok) throw new Error(`quote request failed (${response.status})`)
        return parseCnbcQuotes(await response.json())
    }

    async function requestTradingViewQuotes(
        instruments: MarketInstrument[],
        signal: AbortSignal
    ): Promise<MarketQuote[]> {
        const response = await fetch(TRADINGVIEW_SCAN_ENDPOINT, {
            method: 'POST',
            // text/plain keeps the request CORS-safelisted; the scanner still parses the JSON body.
            headers: { 'Content-Type': 'text/plain' },
            body: buildTradingViewBody(instruments),
            signal,
        })
        if (!response.ok) throw new Error(`market scan failed (${response.status})`)
        return parseTradingViewQuotes(await response.json(), instruments)
    }

    async function fetchQuotes(symbols: string[], key: string, parentSignal: AbortSignal) {
        const generation = ++fetchGeneration
        const controller = new AbortController()
        const abortFromParent = () => controller.abort()
        parentSignal.addEventListener('abort', abortFromParent, { once: true })
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        loading = true
        try {
            if (parentSignal.aborted) return
            const instruments = symbols.map(resolveMarketInstrument)
            const cnbc = instruments.filter((instrument) => getMarketProvider(instrument) === 'cnbc')
            const tradingView = instruments.filter((instrument) => getMarketProvider(instrument) === 'tradingview')
            const requests: Promise<MarketQuote[]>[] = []
            if (cnbc.length) requests.push(requestCnbcQuotes(cnbc, controller.signal))
            if (tradingView.length) requests.push(requestTradingViewQuotes(tradingView, controller.signal))
            if (!requests.length) throw new Error('no market instruments configured')

            const settled = await Promise.allSettled(requests)
            const parsed = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
            const rows = buildMarketQuotes(symbols, parsed)
            if (!rows.length) throw new Error('quote feed returned no usable rows')
            if (generation !== fetchGeneration || key !== watchlistKey) return
            quotes = rows
            updatedAt = new Date()
            loadedKey = key
            failed = settled.some((result) => result.status === 'rejected')
            writeCache(key, rows)
        } catch (error) {
            if (parentSignal.aborted || generation !== fetchGeneration || key !== watchlistKey) return
            if (!quotes.length) console.warn('Markets fetch error:', error)
            failed = true
        } finally {
            clearTimeout(timeout)
            parentSignal.removeEventListener('abort', abortFromParent)
            if (generation === fetchGeneration && key === watchlistKey) loading = false
        }
    }

    function refresh() {
        failed = false
        refreshController?.abort()
        refreshController = new AbortController()
        void fetchQuotes([...watchlist], watchlistKey, refreshController.signal)
    }

    function flashConfigSaved() {
        configSaved = true
        if (configSavedTimer) clearTimeout(configSavedTimer)
        configSavedTimer = setTimeout(() => (configSaved = false), 1500)
    }

    function scheduleSymbolsSave() {
        if (symbolSaveTimer) clearTimeout(symbolSaveTimer)
        symbolSaveTimer = setTimeout(() => void saveSymbols(), 500)
    }

    async function saveSymbols() {
        symbolSaveTimer = undefined
        const parsed = parseCustomSymbols(symbolsDraft)
        const usesDefaults = !parsed.length || hasDefaultWatchlist(region, parsed)
        const value = usesDefaults ? '' : parsed.join(', ')
        try {
            await setSetting('marketSymbols', value)
            appState.marketSymbols = value
            if (usesDefaults) symbolsDraft = regionDefaults.join(', ')
            flashConfigSaved()
        } catch (error) {
            console.error('Failed to save market symbols', error)
        }
    }

    function flushSymbolsSave() {
        if (!symbolSaveTimer) return
        clearTimeout(symbolSaveTimer)
        symbolSaveTimer = undefined
        void saveSymbols()
    }

    async function selectRegion(value: string) {
        const draftSymbols = parseCustomSymbols(symbolsDraft)
        const wasUsingDefaults = !draftSymbols.length || hasDefaultWatchlist(region, draftSymbols)
        flushSymbolsSave()

        const next = value === 'auto' || isMarketRegion(value) ? value : 'auto'
        appState.marketsRegion = next
        if (wasUsingDefaults) {
            const nextRegion = next === 'auto' ? autoRegion : next
            symbolsDraft = getMarketWatchlist(nextRegion).join(', ')
        }
        try {
            await setSetting('marketsRegion', next)
            flashConfigSaved()
        } catch (error) {
            console.error('Failed to save markets region', error)
        }
    }

    async function resetConfig() {
        if (symbolSaveTimer) {
            clearTimeout(symbolSaveTimer)
            symbolSaveTimer = undefined
        }
        symbolsDraft = getMarketWatchlist(autoRegion).join(', ')
        appState.marketsRegion = 'auto'
        appState.marketSymbols = ''
        try {
            await Promise.all([setSetting('marketsRegion', 'auto'), setSetting('marketSymbols', '')])
            flashConfigSaved()
        } catch (error) {
            console.error('Failed to reset markets settings', error)
        }
    }

    function toggleConfig() {
        if (configOpen) {
            flushSymbolsSave()
            configOpen = false
            void tick().then(() => configButton?.focus())
            return
        }
        symbolsDraft = appState.marketSymbols || regionDefaults.join(', ')
        configOpen = true
        void tick().then(() => configEl?.querySelector<HTMLElement>('select')?.focus())
    }

    onDestroy(() => {
        flushSymbolsSave()
        if (configSavedTimer) clearTimeout(configSavedTimer)
    })

    $effect(() => {
        if (!appState.showMarkets) configOpen = false
    })

    $effect(() => {
        if (!appState.showMarkets) return
        const symbols = [...watchlist]
        const key = watchlistKey
        if (!symbols.length) return

        const fresh = hydrate(key)
        const controller = new AbortController()
        if (!fresh) void fetchQuotes(symbols, key, controller.signal)

        const tick = () => {
            if (document.visibilityState === 'visible') void fetchQuotes(symbols, key, controller.signal)
        }
        const timer = setInterval(tick, REFRESH_INTERVAL)
        const onVisible = () => {
            if (document.visibilityState === 'visible') tick()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
            controller.abort()
            refreshController?.abort()
            refreshController = null
        }
    })

    function toneText(tone: MarketTone): string {
        return tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-fg-muted'
    }

    function formatUpdated(date: Date): string {
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }

    function quoteTitle(quote: MarketQuote): string {
        return [quote.name, MARKET_STATUS_LABELS[quote.status], quote.quoteTimeLabel].filter(Boolean).join(' · ')
    }

    const placeholderCount = $derived(Math.min(Math.max(watchlist.length, 4), MAX_MARKET_SYMBOLS))
    const unavailable = $derived(
        quotes.length ? watchlist.filter((symbol) => !quotes.some((quote) => quote.symbol === symbol)) : []
    )
</script>

{#if appState.showMarkets}
    <div
        class={`z-40 w-full md:fixed md:right-24 md:left-auto md:w-[var(--q-widget-width)] md:transition-[top] md:duration-300 md:ease-out ${
            appState.showWeather ? 'md:top-25' : 'md:top-6'
        }`}
        in:fly={{ y: -16, duration: 300, easing: cubicOut }}
        out:fly={{ y: -16, duration: 300, easing: cubicOut }}
    >
        <section
            class="overflow-hidden rounded-xl border border-line bg-surface text-left shadow-xl"
            aria-labelledby="markets-heading"
            aria-busy={loading && !quotes.length}
        >
            <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-2 md:px-5 md:py-2.5">
                <div class="flex min-w-0 items-center gap-1.5">
                    <h2
                        id="markets-heading"
                        class="text-[10px] font-semibold uppercase tracking-wide text-fg-muted md:text-[11px]"
                    >
                        Markets
                    </h2>
                    <span class="text-fg-subtle" aria-hidden="true">·</span>
                    <span data-testid="markets-region" class="truncate text-[10px] text-fg-muted md:text-[11px]"
                        >{getRegionLabel(region)}</span
                    >
                </div>
                <div class="flex shrink-0 items-center gap-2 text-[10px] text-fg-muted md:text-[11px]">
                    {#if failed && quotes.length > 0}
                        <span
                            class="text-[9px] font-semibold uppercase tracking-wide text-warning"
                            title="The last update did not reach the quote feed"
                        >
                            Stale
                        </span>
                    {/if}
                    {#if updatedAt}
                        <time
                            datetime={updatedAt.toISOString()}
                            class="tabular-nums"
                            title="Time this widget last fetched quotes. Quotes may be delayed by up to 15 minutes."
                            aria-label={`Last fetched ${formatUpdated(updatedAt)}. Quotes may be delayed by up to 15 minutes.`}
                        >
                            {formatUpdated(updatedAt)}
                        </time>
                    {/if}
                    {#if unavailable.length}
                        <span
                            class="whitespace-nowrap text-warning"
                            title={`Unavailable: ${unavailable.join(', ')}`}
                            aria-label={`Unavailable: ${unavailable.join(', ')}`}
                        >
                            {unavailable.length} unavailable
                        </span>
                    {/if}
                    <div class="flex items-center gap-0.5">
                        <button
                            type="button"
                            bind:this={configButton}
                            onclick={toggleConfig}
                            aria-label={configOpen ? 'Close market settings' : 'Customize markets'}
                            aria-expanded={configOpen}
                            aria-controls="markets-config"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:h-8 sm:w-8"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 7h7m4 0h5M4 17h5m4 0h7M11 4v6M15 14v6"
                                />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onclick={refresh}
                            disabled={loading}
                            aria-label="Refresh market quotes"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50 sm:h-8 sm:w-8"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                class:animate-spin={loading}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {#if configOpen}
                <div
                    id="markets-config"
                    bind:this={configEl}
                    class="space-y-2 border-b border-line bg-surface-2/30 px-4 py-2.5 md:px-5 md:py-3"
                    data-shortcut-blocker
                    transition:slide={{ duration: 200 }}
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <label
                            for="markets-region"
                            class="text-[10px] font-semibold uppercase tracking-wide text-fg-muted md:text-[11px]"
                        >
                            Region
                        </label>
                        <select
                            id="markets-region"
                            value={selectedRegion}
                            onchange={(event) => void selectRegion((event.currentTarget as HTMLSelectElement).value)}
                            class="rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-fg transition-colors hover:border-line-strong focus:border-accent focus:outline-none md:text-xs"
                        >
                            <option value="auto">Auto (this device)</option>
                            {#each MARKET_REGIONS as region (region.id)}
                                <option value={region.id}>{region.label}</option>
                            {/each}
                        </select>
                        {#if selectedRegion === 'auto'}
                            <span class="text-[10px] text-fg-muted md:text-[11px]">Uses this device's timezone.</span>
                        {/if}
                    </div>

                    <div class="flex flex-wrap items-end gap-2">
                        <div class="min-w-0 flex-1">
                            <label
                                for="markets-symbols-inline"
                                class="text-[10px] font-semibold uppercase tracking-wide text-fg-muted md:text-[11px]"
                            >
                                Instruments
                            </label>
                            <input
                                id="markets-symbols-inline"
                                bind:value={symbolsDraft}
                                oninput={scheduleSymbolsSave}
                                placeholder={regionDefaults.join(', ')}
                                maxlength={200}
                                autocomplete="off"
                                spellcheck="false"
                                aria-describedby="markets-symbols-inline-help"
                                class="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-fg transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:outline-none md:text-xs"
                            />
                            <p id="markets-symbols-inline-help" class="mt-1 text-[10px] text-fg-muted md:text-[11px]">
                                Up to {MAX_MARKET_SYMBOLS} symbols, comma separated. Editing replaces the {getRegionLabel(
                                    region
                                )} defaults.
                            </p>
                        </div>
                        <div class="flex items-center gap-2 pb-4">
                            {#if appState.marketSymbols || selectedRegion !== 'auto'}
                                <button
                                    type="button"
                                    onclick={() => void resetConfig()}
                                    class="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg md:text-[11px]"
                                >
                                    Reset
                                </button>
                            {/if}
                            <span class="text-[10px] text-success {configSaved ? '' : 'invisible'}" aria-live="polite">
                                Saved
                            </span>
                            <button
                                type="button"
                                onclick={toggleConfig}
                                class="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg md:text-[11px]"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            {/if}

            {#if !quotes.length && failed}
                <div class="px-4 py-6 text-center">
                    <p class="text-xs font-medium text-fg">Market data is unavailable right now.</p>
                    <p class="mt-1 text-[10px] text-fg-subtle">Check your connection, then try again.</p>
                    <button
                        type="button"
                        onclick={refresh}
                        class="mt-3 rounded-md border border-line px-3 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                    >
                        Retry
                    </button>
                </div>
            {:else}
                <div class="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-2.5 md:gap-x-6 md:gap-y-3.5 md:px-5 md:py-3.5">
                    {#if quotes.length}
                        {#each quotes as quote (quote.symbol)}
                            <a
                                href={quote.url}
                                target="_blank"
                                rel="external noopener noreferrer"
                                class="group -mx-1 min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-2/50 focus-visible:bg-surface-2/50"
                                title={quoteTitle(quote)}
                                aria-label={buildMarketAriaLabel(quote)}
                            >
                                <div class="flex items-baseline justify-between gap-2">
                                    <span
                                        class="min-w-0 truncate text-[10px] font-medium uppercase tracking-wide text-fg-muted md:text-[11px]"
                                    >
                                        {quote.label}
                                    </span>
                                    <span
                                        class="shrink-0 text-[10px] font-medium tabular-nums md:text-[11px] {toneText(
                                            quote.tone
                                        )}"
                                    >
                                        {quote.changePctText || '—'}
                                    </span>
                                </div>
                                <div
                                    class="mt-1.5 text-[15px] font-semibold leading-none tracking-tight tabular-nums text-fg md:text-[18px]"
                                >
                                    {quote.valueText}
                                </div>
                            </a>
                        {/each}
                    {:else}
                        {#each [...Array(placeholderCount).keys()] as index (index)}
                            <div aria-hidden="true">
                                <div class="h-2 w-16 rounded-sm bg-surface-2"></div>
                                <div class="mt-2 h-[15px] w-20 rounded-sm bg-surface-2 md:h-[18px]"></div>
                            </div>
                        {/each}
                    {/if}
                </div>
            {/if}
        </section>
    </div>
{/if}
