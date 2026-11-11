export type MarketRegion =
    | 'global'
    | 'us'
    | 'ca'
    | 'br'
    | 'uk'
    | 'eu'
    | 'in'
    | 'jp'
    | 'hk'
    | 'cn'
    | 'kr'
    | 'tw'
    | 'sg'
    | 'au'

export type MarketTone = 'up' | 'down' | 'flat'
export type MarketStatus = 'regular' | 'pre' | 'post' | 'closed' | 'halted' | 'unknown'
export type MarketProvider = 'cnbc' | 'tradingview'

export interface MarketInstrument {
    symbol: string
    label: string
    shortLabel: string
    name: string
    provider?: MarketProvider
    providerSymbol?: string
    url?: string
}

export interface MarketQuote {
    symbol: string
    label: string
    shortLabel: string
    name: string
    value: number
    valueText: string
    change: number | null
    changeText: string
    changePct: number | null
    changePctText: string
    changePctAbsText: string
    tone: MarketTone
    low: number | null
    high: number | null
    range: number | null
    status: MarketStatus
    quoteTimeLabel: string
    currency: string
    delayed: boolean
    url: string
}

/**
 * CNBC's public quote feed: no key, no account, and CORS is open to every
 * origin, which is why it works in both the web build and an MV3 page.
 */
export const MARKET_QUOTE_ENDPOINT = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'

/**
 * TradingView's public scanner endpoint covers instruments CNBC does not list,
 * such as GIFT Nifty. It is keyless, CORS-open and accepts a JSON body as a
 * CORS-safelisted `text/plain` request, so no preflight is needed.
 */
export const TRADINGVIEW_SCAN_ENDPOINT = 'https://scanner.tradingview.com/global/scan'

export const MAX_MARKET_SYMBOLS = 8

export const MARKET_CATALOG: Record<string, MarketInstrument> = {
    '.SPX': { symbol: '.SPX', label: 'S&P 500', shortLabel: 'S&P', name: 'S&P 500 Index' },
    '.IXIC': { symbol: '.IXIC', label: 'Nasdaq', shortLabel: 'NDQ', name: 'NASDAQ Composite' },
    '.NDX': { symbol: '.NDX', label: 'Nasdaq 100', shortLabel: 'NDX', name: 'NASDAQ-100 Index' },
    '.DJI': { symbol: '.DJI', label: 'Dow 30', shortLabel: 'DOW', name: 'Dow Jones Industrial Average' },
    '.FTSE': { symbol: '.FTSE', label: 'FTSE 100', shortLabel: 'FTSE', name: 'FTSE 100' },
    '.GDAXI': { symbol: '.GDAXI', label: 'DAX', shortLabel: 'DAX', name: 'Germany DAX' },
    '.FCHI': { symbol: '.FCHI', label: 'CAC 40', shortLabel: 'CAC', name: 'CAC 40' },
    '.STOXX50E': { symbol: '.STOXX50E', label: 'Euro Stoxx 50', shortLabel: 'SX5E', name: 'Euro Stoxx 50 Index' },
    '.STOXX': { symbol: '.STOXX', label: 'Stoxx 600', shortLabel: 'SXXP', name: 'STOXX Europe 600' },
    '.IBEX': { symbol: '.IBEX', label: 'IBEX 35', shortLabel: 'IBEX', name: 'IBEX 35' },
    '.AEX': { symbol: '.AEX', label: 'AEX', shortLabel: 'AEX', name: 'AEX' },
    '.SSMI': { symbol: '.SSMI', label: 'SMI', shortLabel: 'SMI', name: 'Swiss Market Index' },
    '.NSEI': { symbol: '.NSEI', label: 'NIFTY 50', shortLabel: 'NIFTY', name: 'Nifty 50 Index' },
    '.NSEBANK': { symbol: '.NSEBANK', label: 'Bank Nifty', shortLabel: 'BANK', name: 'Nifty Bank Index' },
    GIFTNIFTY: {
        symbol: 'GIFTNIFTY',
        label: 'Gift Nifty',
        shortLabel: 'GIFT',
        name: 'GIFT Nifty 50 Index Futures',
        provider: 'tradingview',
        providerSymbol: 'NSEIX:NIFTY1!',
        url: 'https://www.tradingview.com/symbols/NSEIX-NIFTY1!/',
    },
    '.N225': { symbol: '.N225', label: 'Nikkei 225', shortLabel: 'N225', name: 'Nikkei 225' },
    '.HSI': { symbol: '.HSI', label: 'Hang Seng', shortLabel: 'HSI', name: 'Hang Seng Index' },
    '.SSEC': { symbol: '.SSEC', label: 'Shanghai', shortLabel: 'SSEC', name: 'Shanghai Composite' },
    '.KS11': { symbol: '.KS11', label: 'KOSPI', shortLabel: 'KOSPI', name: 'KOSPI' },
    '.TWII': { symbol: '.TWII', label: 'TAIEX', shortLabel: 'TAIEX', name: 'Taiwan Weighted Index' },
    '.STI': { symbol: '.STI', label: 'STI', shortLabel: 'STI', name: 'Straits Times Index' },
    '.AXJO': { symbol: '.AXJO', label: 'ASX 200', shortLabel: 'ASX', name: 'S&P/ASX 200' },
    '.GSPTSE': { symbol: '.GSPTSE', label: 'TSX', shortLabel: 'TSX', name: 'S&P/TSX Composite' },
    '.BVSP': { symbol: '.BVSP', label: 'Bovespa', shortLabel: 'IBOV', name: 'Bovespa Index' },
    '@SP.1': { symbol: '@SP.1', label: 'S&P futures', shortLabel: 'ES', name: 'S&P 500 E-mini Futures' },
    '@ND.1': { symbol: '@ND.1', label: 'Nasdaq futures', shortLabel: 'NQ', name: 'Nasdaq 100 E-mini Futures' },
    '@DJ.1': { symbol: '@DJ.1', label: 'Dow futures', shortLabel: 'YM', name: 'Dow E-mini Futures' },
    '@CL.1': { symbol: '@CL.1', label: 'WTI crude', shortLabel: 'WTI', name: 'WTI Crude Oil Futures' },
    '@LCO.1': { symbol: '@LCO.1', label: 'Brent crude', shortLabel: 'BRENT', name: 'Brent Crude Oil Futures' },
    '@GC.1': { symbol: '@GC.1', label: 'Gold', shortLabel: 'GOLD', name: 'Gold Futures' },
    '@SI.1': { symbol: '@SI.1', label: 'Silver', shortLabel: 'SILVER', name: 'Silver Futures' },
    '@HG.1': { symbol: '@HG.1', label: 'Copper', shortLabel: 'COPPER', name: 'Copper Futures' },
    '@NG.1': { symbol: '@NG.1', label: 'Natural gas', shortLabel: 'GAS', name: 'Natural Gas Futures' },
}

export const MARKET_REGION_LABELS: Record<MarketRegion, string> = {
    us: 'US',
    ca: 'Canada',
    br: 'Brazil',
    uk: 'UK',
    eu: 'Europe',
    in: 'India',
    jp: 'Japan',
    hk: 'Hong Kong',
    cn: 'China',
    kr: 'Korea',
    tw: 'Taiwan',
    sg: 'Singapore',
    au: 'Australia',
    global: 'Global',
}

export const MARKET_REGIONS = (Object.keys(MARKET_REGION_LABELS) as MarketRegion[]).map((id) => ({
    id,
    label: MARKET_REGION_LABELS[id],
}))

export const REGION_WATCHLISTS: Record<MarketRegion, string[]> = {
    global: ['.SPX', '@SP.1', '@CL.1', '@GC.1'],
    us: ['.SPX', '@SP.1', '@CL.1', '@GC.1'],
    ca: ['.GSPTSE', '@SP.1', '@CL.1', '@GC.1'],
    br: ['.BVSP', '@SP.1', '@CL.1', '@GC.1'],
    uk: ['.FTSE', '@SP.1', '@LCO.1', '@GC.1'],
    eu: ['.GDAXI', '@SP.1', '@LCO.1', '@GC.1'],
    in: ['GIFTNIFTY', '.NSEI', '@LCO.1', '@GC.1'],
    jp: ['.N225', '@SP.1', '@CL.1', '@GC.1'],
    hk: ['.HSI', '@SP.1', '@CL.1', '@GC.1'],
    cn: ['.SSEC', '@SP.1', '@CL.1', '@GC.1'],
    kr: ['.KS11', '@SP.1', '@CL.1', '@GC.1'],
    tw: ['.TWII', '@SP.1', '@CL.1', '@GC.1'],
    sg: ['.STI', '@SP.1', '@CL.1', '@GC.1'],
    au: ['.AXJO', '@SP.1', '@CL.1', '@GC.1'],
}

const COUNTRY_REGIONS: Record<string, MarketRegion> = {
    US: 'us',
    CA: 'ca',
    BR: 'br',
    GB: 'uk',
    IE: 'uk',
    IN: 'in',
    JP: 'jp',
    HK: 'hk',
    CN: 'cn',
    KR: 'kr',
    TW: 'tw',
    SG: 'sg',
    AU: 'au',
    NZ: 'au',
    DE: 'eu',
    FR: 'eu',
    NL: 'eu',
    BE: 'eu',
    AT: 'eu',
    CH: 'eu',
    ES: 'eu',
    IT: 'eu',
    PT: 'eu',
    GR: 'eu',
    FI: 'eu',
    SE: 'eu',
    DK: 'eu',
    NO: 'eu',
    PL: 'eu',
    CZ: 'eu',
}

const TIME_ZONE_REGIONS: Record<string, MarketRegion> = {
    'America/New_York': 'us',
    'America/Chicago': 'us',
    'America/Denver': 'us',
    'America/Phoenix': 'us',
    'America/Los_Angeles': 'us',
    'America/Anchorage': 'us',
    'Pacific/Honolulu': 'us',
    'America/Toronto': 'ca',
    'America/Vancouver': 'ca',
    'America/Edmonton': 'ca',
    'America/Winnipeg': 'ca',
    'America/Halifax': 'ca',
    'America/Sao_Paulo': 'br',
    'America/Bahia': 'br',
    'America/Fortaleza': 'br',
    'America/Manaus': 'br',
    'Europe/London': 'uk',
    'Europe/Dublin': 'uk',
    'Asia/Kolkata': 'in',
    'Asia/Calcutta': 'in',
    'Asia/Tokyo': 'jp',
    'Asia/Hong_Kong': 'hk',
    'Asia/Shanghai': 'cn',
    'Asia/Chongqing': 'cn',
    'Asia/Urumqi': 'cn',
    'Asia/Seoul': 'kr',
    'Asia/Taipei': 'tw',
    'Asia/Singapore': 'sg',
    'Australia/Sydney': 'au',
    'Australia/Melbourne': 'au',
    'Australia/Brisbane': 'au',
    'Australia/Adelaide': 'au',
    'Australia/Perth': 'au',
    'Pacific/Auckland': 'au',
}

function localeCountry(locale?: string): string | undefined {
    if (!locale) return undefined
    try {
        return new Intl.Locale(locale).maximize().region
    } catch {
        const parts = locale.split('-')
        return parts.length > 1 ? parts[1].toUpperCase() : undefined
    }
}

/** Picks a market region from the device clock/locale, with a global fallback. */
export function resolveMarketRegion(input: { timeZone?: string; locale?: string }): MarketRegion {
    const timeZone = input.timeZone?.trim()
    if (timeZone) {
        const exact = TIME_ZONE_REGIONS[timeZone]
        if (exact) return exact
        if (timeZone.startsWith('Europe/')) return 'eu'
        if (timeZone.startsWith('Australia/')) return 'au'
    }

    const country = localeCountry(input.locale)
    if (country && COUNTRY_REGIONS[country]) return COUNTRY_REGIONS[country]
    return 'global'
}

export function isMarketRegion(value: string): value is MarketRegion {
    return Object.prototype.hasOwnProperty.call(MARKET_REGION_LABELS, value)
}

export function getRegionLabel(region: MarketRegion): string {
    return MARKET_REGION_LABELS[region] ?? MARKET_REGION_LABELS.global
}

/** Normalizes comma/space separated symbols, dropping duplicates and unsafe characters. */
export function parseCustomSymbols(raw: string, limit = MAX_MARKET_SYMBOLS): string[] {
    const symbols: string[] = []
    const seen = new Set<string>()
    for (const token of raw.split(/[\s,]+/)) {
        const symbol = token.trim().toUpperCase()
        if (!symbol || !/^(?=.*[A-Z0-9])[A-Z0-9.@=^:_-]{1,20}$/.test(symbol) || seen.has(symbol)) continue
        seen.add(symbol)
        symbols.push(symbol)
        if (symbols.length >= limit) break
    }
    return symbols
}

/** A non-empty custom list replaces the region preset; an empty one keeps the defaults. */
export function getMarketWatchlist(region: MarketRegion, customSymbols: string[] = []): string[] {
    const defaults = REGION_WATCHLISTS[region] ?? REGION_WATCHLISTS.global
    const symbols = customSymbols.length ? customSymbols : defaults
    return [...new Set(symbols)].slice(0, MAX_MARKET_SYMBOLS)
}

export function hasDefaultWatchlist(region: MarketRegion, symbols: string[]): boolean {
    const defaults = getMarketWatchlist(region)
    return symbols.length === defaults.length && symbols.every((symbol, index) => symbol === defaults[index])
}

export function getMarketInstrument(symbol: string): MarketInstrument | undefined {
    return MARKET_CATALOG[symbol]
}

/** Catalog entry for a configured symbol, or a CNBC-backed row for a user-typed one. */
export function resolveMarketInstrument(symbol: string): MarketInstrument {
    return MARKET_CATALOG[symbol] ?? { symbol, label: symbol, shortLabel: symbol, name: symbol }
}

export function getMarketProvider(instrument: MarketInstrument): MarketProvider {
    return instrument.provider ?? 'cnbc'
}

export function getProviderSymbol(instrument: MarketInstrument): string {
    return instrument.providerSymbol ?? instrument.symbol
}

export function buildMarketQuoteUrl(symbols: string[]): string {
    const query = new URLSearchParams({
        symbols: symbols.join('|'),
        requestMethod: 'itv',
        noform: '1',
        partnerId: '2',
        fund: '1',
        exthrs: '1',
        output: 'json',
        events: '1',
    })
    return `${MARKET_QUOTE_ENDPOINT}?${query.toString()}`
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function readText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function parseMarketNumber(value: string | undefined): number | null {
    if (!value) return null
    const parsed = Number(value.replace(/[,\s%]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
}

export function formatMarketNumber(value: number): string {
    const digits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)
}

/** Formats a provider timestamp in the device's local timezone so every instrument reads on one clock. */
export function formatQuoteTime(epoch: number, hasTime: boolean, now: Date = new Date()): string {
    const date = new Date(epoch)
    if (!hasTime) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function parseQuoteTime(value: string | undefined): { at: number; hasTime: boolean } | null {
    if (!value) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number)
        const at = new Date(year, month - 1, day, 12).getTime()
        return Number.isFinite(at) ? { at, hasTime: false } : null
    }
    const at = Date.parse(value)
    return Number.isFinite(at) ? { at, hasTime: true } : null
}

function formatSignedNumber(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}${formatMarketNumber(Math.abs(value))}`
}

function formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(value))
    return `${sign}${formatted}%`
}

function normalizeStatus(raw: string | undefined): MarketStatus {
    switch (raw?.toUpperCase()) {
        case 'REG_MKT':
            return 'regular'
        case 'PRE_MKT':
            return 'pre'
        case 'POST_MKT':
            return 'post'
        case 'CLOSED':
        case 'CLOSE':
            return 'closed'
        case 'HALTED':
        case 'HALT':
            return 'halted'
        default:
            return 'unknown'
    }
}

export const MARKET_STATUS_LABELS: Record<MarketStatus, string> = {
    regular: 'Regular',
    pre: 'Pre',
    post: 'After',
    closed: 'Closed',
    halted: 'Halted',
    unknown: '',
}

function toQuote(raw: Record<string, unknown>): MarketQuote | null {
    const symbol = readText(raw.symbol)?.toUpperCase()
    const valueText = readText(raw.last)
    const value = parseMarketNumber(valueText)
    if (!symbol || !valueText || value === null) return null

    const instrument = MARKET_CATALOG[symbol]
    const shortName = readText(raw.shortName)
    const longName = readText(raw.name)
    const change = parseMarketNumber(readText(raw.change))
    const changePct = parseMarketNumber(readText(raw.change_pct))
    const low = parseMarketNumber(readText(raw.low))
    const high = parseMarketNumber(readText(raw.high))
    const parsedTime = parseQuoteTime(readText(raw.last_time))
    const quoteTimeLabel = parsedTime
        ? formatQuoteTime(parsedTime.at, parsedTime.hasTime)
        : (readText(raw.last_timedate) ?? readText(raw.last_time) ?? '')
    const toneValue = changePct ?? change ?? 0
    const changePctText =
        readText(raw.change_pct) ??
        (change !== null && value - change !== 0 ? `${formatSignedNumber((change / (value - change)) * 100)}%` : '')
    const changeText = readText(raw.change) ?? (change !== null ? formatSignedNumber(change) : '')

    return {
        symbol,
        label: instrument?.label ?? shortName ?? longName ?? symbol,
        shortLabel: instrument?.shortLabel ?? shortName ?? longName ?? symbol,
        name: instrument?.name ?? longName ?? shortName ?? symbol,
        value,
        valueText,
        change,
        changeText,
        changePct,
        changePctText,
        changePctAbsText: changePctText.replace(/^[+-]/, '') || '—',
        tone: toneValue > 0 ? 'up' : toneValue < 0 ? 'down' : 'flat',
        low,
        high,
        range:
            low !== null && high !== null && high > low
                ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
                : null,
        status: normalizeStatus(readText(raw.curmktstatus)),
        quoteTimeLabel,
        currency: readText(raw.currencyCode) ?? '',
        delayed: readText(raw.realTime) !== 'true',
        url: instrument?.url ?? `https://www.cnbc.com/quotes/${symbol}`,
    }
}

/** Parses the CNBC payload into quotes, silently skipping symbols the feed could not resolve. */
export function parseCnbcQuotes(payload: unknown): MarketQuote[] {
    const result = asRecord(asRecord(payload)?.FormattedQuoteResult)
    const rawList = result?.FormattedQuote
    const list = Array.isArray(rawList) ? rawList : rawList ? [rawList] : []
    const quotes: MarketQuote[] = []
    for (const entry of list) {
        const record = asRecord(entry)
        if (!record || record.code !== 0) continue
        const quote = toQuote(record)
        if (quote) quotes.push(quote)
    }
    return quotes
}

export const TRADINGVIEW_COLUMNS = [
    'close',
    'change',
    'change_abs',
    'high',
    'low',
    'currency',
    'description',
    'update_mode',
] as const

/** Builds the scanner request body for the TradingView-backed instruments. */
export function buildTradingViewBody(instruments: MarketInstrument[]): string {
    return JSON.stringify({
        symbols: { tickers: instruments.map(getProviderSymbol), query: { types: [] } },
        columns: [...TRADINGVIEW_COLUMNS],
    })
}

function readNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[,\s%]/g, ''))
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function toTradingViewQuote(instrument: MarketInstrument, row: unknown[]): MarketQuote | null {
    const value = readNumber(row[0])
    if (value === null) return null

    const changePct = readNumber(row[1])
    const change = readNumber(row[2])
    const high = readNumber(row[3])
    const low = readNumber(row[4])
    const currency = readText(row[5]) ?? ''
    const description = readText(row[6])
    const updateMode = readText(row[7]) ?? ''
    const toneValue = changePct ?? change ?? 0
    const changePctText = changePct !== null ? formatSignedPercent(changePct) : ''
    const changeText = change !== null ? formatSignedNumber(change) : ''

    return {
        symbol: instrument.symbol,
        label: instrument.label || description || instrument.symbol,
        shortLabel: instrument.shortLabel || description || instrument.symbol,
        name: instrument.name || description || instrument.symbol,
        value,
        valueText: formatMarketNumber(value),
        change,
        changeText,
        changePct,
        changePctText,
        changePctAbsText: changePctText.replace(/^[+-]/, '') || '—',
        tone: toneValue > 0 ? 'up' : toneValue < 0 ? 'down' : 'flat',
        low,
        high,
        range:
            low !== null && high !== null && high > low
                ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
                : null,
        status: 'unknown',
        quoteTimeLabel: '',
        currency,
        delayed: updateMode ? !updateMode.startsWith('streaming') : false,
        url:
            instrument.url ?? `https://www.tradingview.com/symbols/${getProviderSymbol(instrument).replace(':', '-')}/`,
    }
}

/** Parses the TradingView scanner payload, matching rows back to the requested instruments. */
export function parseTradingViewQuotes(payload: unknown, instruments: MarketInstrument[]): MarketQuote[] {
    const data = asRecord(payload)?.data
    if (!Array.isArray(data)) return []

    const byProviderSymbol = new Map(
        instruments.map((instrument) => [getProviderSymbol(instrument).toUpperCase(), instrument])
    )
    const quotes: MarketQuote[] = []
    for (const entry of data) {
        const record = asRecord(entry)
        const providerSymbol = readText(record?.s)?.toUpperCase()
        const row = record?.d
        if (!providerSymbol || !Array.isArray(row)) continue
        const instrument = byProviderSymbol.get(providerSymbol)
        if (!instrument) continue
        const quote = toTradingViewQuote(instrument, row)
        if (quote) quotes.push(quote)
    }
    return quotes
}

/** Orders parsed quotes to match the configured watchlist. */
export function buildMarketQuotes(symbols: string[], quotes: MarketQuote[]): MarketQuote[] {
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote]))
    return symbols
        .map((symbol) => bySymbol.get(symbol.toUpperCase()))
        .filter((quote): quote is MarketQuote => Boolean(quote))
}

export function buildMarketAriaLabel(quote: MarketQuote): string {
    const direction = quote.tone === 'up' ? 'up' : quote.tone === 'down' ? 'down' : 'flat'
    const change = quote.changeText ? `, ${quote.changeText}` : ''
    const range =
        quote.low !== null && quote.high !== null
            ? `, day range ${formatMarketNumber(quote.low)} to ${formatMarketNumber(quote.high)}`
            : ''
    const session = [MARKET_STATUS_LABELS[quote.status], quote.quoteTimeLabel ? `as of ${quote.quoteTimeLabel}` : '']
        .filter(Boolean)
        .join(', ')
    const currency = quote.currency ? ` ${quote.currency}` : ''
    return `${quote.name}. ${quote.valueText}${currency}${change}, ${direction} ${quote.changePctAbsText}${range}${
        session ? `, ${session}` : ''
    }`
}
