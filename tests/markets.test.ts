import { describe, expect, test } from 'bun:test'
import {
    MARKET_CATALOG,
    buildMarketAriaLabel,
    buildMarketQuoteUrl,
    buildMarketQuotes,
    buildTradingViewBody,
    formatMarketNumber,
    getMarketWatchlist,
    hasDefaultWatchlist,
    parseCnbcQuotes,
    parseCustomSymbols,
    parseMarketNumber,
    parseTradingViewQuotes,
    resolveMarketRegion,
} from '$lib/utils/markets'

const payload = {
    FormattedQuoteResult: {
        FormattedQuote: [
            {
                symbol: '.SPX',
                code: 0,
                shortName: 'SPX',
                name: 'S&P 500 Index',
                last: '7,514.31',
                change: '-35.63',
                change_pct: '-0.47%',
                low: '7,490.65',
                high: '7,543.92',
                curmktstatus: 'REG_MKT',
                last_timedate: '11:04 AM EST',
                last_time: '2026-11-10T11:04:05.000-0500',
                currencyCode: 'USD',
                realTime: 'true',
            },
            {
                symbol: '@CL.1',
                code: 0,
                shortName: 'OIL',
                name: 'WTI Crude (Dec 26)',
                last: '85.54',
                change: '+1.31',
                change_pct: '+1.55%',
                low: '83.88',
                high: '86.93',
                curmktstatus: 'CLOSED',
                currencyCode: 'USD',
                realTime: 'false',
            },
            { symbol: 'NOPE', code: 1 },
        ],
    },
}

describe('parseMarketNumber', () => {
    test('reads signs, grouping commas and percentages', () => {
        expect(parseMarketNumber('+58.25')).toBe(58.25)
        expect(parseMarketNumber('-1,234.5')).toBe(-1234.5)
        expect(parseMarketNumber('-0.47%')).toBe(-0.47)
    })

    test('returns null for missing or unreadable values', () => {
        expect(parseMarketNumber(undefined)).toBeNull()
        expect(parseMarketNumber('')).toBeNull()
        expect(parseMarketNumber('N/A')).toBeNull()
    })
})

describe('parseCnbcQuotes', () => {
    test('parses usable rows and skips unresolved symbols', () => {
        const quotes = parseCnbcQuotes(payload)
        expect(quotes).toHaveLength(2)

        const [spx, crude] = quotes
        expect(spx.symbol).toBe('.SPX')
        expect(spx.label).toBe('S&P 500')
        expect(spx.shortLabel).toBe('S&P')
        expect(spx.name).toBe('S&P 500 Index')
        expect(spx.value).toBe(7514.31)
        expect(spx.valueText).toBe('7,514.31')
        expect(spx.changeText).toBe('-35.63')
        expect(spx.changePct).toBe(-0.47)
        expect(spx.changePctAbsText).toBe('0.47%')
        expect(spx.tone).toBe('down')
        expect(spx.status).toBe('regular')
        expect(spx.quoteTimeLabel).not.toContain('EST')
        expect(spx.quoteTimeLabel).toMatch(/\d{1,2}:\d{2}/)
        expect(spx.currency).toBe('USD')
        expect(spx.delayed).toBe(false)
        expect(spx.range).toBeGreaterThan(0)
        expect(spx.range).toBeLessThan(100)

        expect(crude.tone).toBe('up')
        expect(crude.status).toBe('closed')
        expect(crude.delayed).toBe(true)
    })

    test('treats flat quotes as neutral', () => {
        const [quote] = parseCnbcQuotes({
            FormattedQuoteResult: {
                FormattedQuote: [{ symbol: 'FLAT', code: 0, last: '10.00', change: '0.00', change_pct: '0.00%' }],
            },
        })
        expect(quote.tone).toBe('flat')
        expect(quote.label).toBe('FLAT')
    })

    test('returns an empty list for malformed payloads', () => {
        expect(parseCnbcQuotes(null)).toEqual([])
        expect(parseCnbcQuotes({ FormattedQuoteResult: null })).toEqual([])
        expect(parseCnbcQuotes({ FormattedQuoteResult: { FormattedQuote: 'nope' } })).toEqual([])
    })
})

describe('buildMarketQuotes', () => {
    test('keeps the configured order and drops unavailable symbols', () => {
        const rows = buildMarketQuotes(['@CL.1', '.SPX', 'MISSING'], parseCnbcQuotes(payload))
        expect(rows.map((quote) => quote.symbol)).toEqual(['@CL.1', '.SPX'])
    })
})

describe('TradingView-backed instruments', () => {
    const tradingViewPayload = {
        totalCount: 2,
        data: [
            {
                s: 'NSEIX:NIFTY1!',
                d: [25205, -0.4876, -123.5, 25472.5, 25156.5, 'USD', 'GIFT NIFTY 50 INDEX FUTURES', 'streaming'],
            },
            { s: 'NSEIX:MISSING', d: [1, 0, 0, 1, 1, 'USD', 'Missing contract', 'streaming'] },
        ],
    }

    test('builds a scanner request for catalog provider symbols', () => {
        const body = JSON.parse(buildTradingViewBody([MARKET_CATALOG.GIFTNIFTY]))
        expect(body.symbols.tickers).toEqual(['NSEIX:NIFTY1!'])
        expect(body.columns).toContain('close')
        expect(body.columns).toContain('change_abs')
    })

    test('maps scanner rows back to configured instruments', () => {
        const quotes = parseTradingViewQuotes(tradingViewPayload, [MARKET_CATALOG.GIFTNIFTY])
        expect(quotes).toHaveLength(1)

        const [quote] = quotes
        expect(quote.symbol).toBe('GIFTNIFTY')
        expect(quote.label).toBe('Gift Nifty')
        expect(quote.name).toBe('GIFT Nifty 50 Index Futures')
        expect(quote.value).toBe(25205)
        expect(quote.valueText).toBe('25,205.00')
        expect(quote.change).toBe(-123.5)
        expect(quote.changeText).toBe('-123.50')
        expect(quote.changePctText).toBe('-0.49%')
        expect(quote.changePctAbsText).toBe('0.49%')
        expect(quote.tone).toBe('down')
        expect(quote.low).toBe(25156.5)
        expect(quote.high).toBe(25472.5)
        expect(quote.currency).toBe('USD')
        expect(quote.status).toBe('unknown')
        expect(quote.quoteTimeLabel).toBe('')
        expect(quote.delayed).toBe(false)
        expect(quote.range).toBeGreaterThan(0)
    })

    test('flags delayed scanner rows and ignores unknown payloads', () => {
        const [delayed] = parseTradingViewQuotes(
            {
                data: [
                    {
                        s: 'NSEIX:NIFTY1!',
                        d: [25205, 0.5, 123.5, 25400, 25000, 'USD', 'GIFT NIFTY', 'delayed_streaming_600'],
                    },
                ],
            },
            [MARKET_CATALOG.GIFTNIFTY]
        )
        expect(delayed.delayed).toBe(true)
        expect(delayed.tone).toBe('up')

        expect(parseTradingViewQuotes(null, [MARKET_CATALOG.GIFTNIFTY])).toEqual([])
        expect(parseTradingViewQuotes({ data: 'nope' }, [MARKET_CATALOG.GIFTNIFTY])).toEqual([])
        expect(parseTradingViewQuotes({ data: [{ s: 'UNKNOWN', d: [1] }] }, [MARKET_CATALOG.GIFTNIFTY])).toEqual([])
    })
})

describe('resolveMarketRegion', () => {
    test('maps common device timezones', () => {
        expect(resolveMarketRegion({ timeZone: 'Asia/Kolkata' })).toBe('in')
        expect(resolveMarketRegion({ timeZone: 'America/New_York' })).toBe('us')
        expect(resolveMarketRegion({ timeZone: 'Europe/Berlin' })).toBe('eu')
        expect(resolveMarketRegion({ timeZone: 'Europe/London' })).toBe('uk')
        expect(resolveMarketRegion({ timeZone: 'Australia/Sydney' })).toBe('au')
        expect(resolveMarketRegion({ timeZone: 'Asia/Tokyo' })).toBe('jp')
    })

    test('falls back to the locale country', () => {
        expect(resolveMarketRegion({ locale: 'en-IN' })).toBe('in')
        expect(resolveMarketRegion({ timeZone: 'Etc/UTC', locale: 'en-GB' })).toBe('uk')
    })

    test('uses global when nothing matches', () => {
        expect(resolveMarketRegion({})).toBe('global')
        expect(resolveMarketRegion({ timeZone: 'Etc/UTC', locale: 'xx-zz' })).toBe('global')
    })
})

describe('parseCustomSymbols', () => {
    test('normalizes, dedupes and rejects unsafe tokens', () => {
        expect(parseCustomSymbols('aapl, nvda  AAPL |bad @sp.1 BTC=')).toEqual(['AAPL', 'NVDA', '@SP.1', 'BTC='])
    })

    test('honors the configured limit', () => {
        expect(parseCustomSymbols('A B C D E F', 2)).toEqual(['A', 'B'])
    })

    test('defaults to the eight-instrument cap', () => {
        expect(parseCustomSymbols('A B C D E F G H I')).toHaveLength(8)
    })

    test('ignores blank input', () => {
        expect(parseCustomSymbols(' ,  ')).toEqual([])
    })
})

describe('getMarketWatchlist', () => {
    test('uses regional defaults when no instruments are configured', () => {
        expect(getMarketWatchlist('in')).toEqual(['GIFTNIFTY', '.NSEI', '@LCO.1', '@GC.1'])
        expect(getMarketWatchlist('us')).toEqual(['.SPX', '@SP.1', '@CL.1', '@GC.1'])
    })

    test('treats a custom list as a replacement for the regional defaults', () => {
        expect(getMarketWatchlist('in', ['AAPL', 'NVDA'])).toEqual(['AAPL', 'NVDA'])
    })

    test('deduplicates and caps the board at eight instruments', () => {
        expect(getMarketWatchlist('global', ['.SPX', '.SPX', 'AAPL'])).toEqual(['.SPX', 'AAPL'])
        const symbols = getMarketWatchlist('global', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
        expect(symbols).toHaveLength(8)
    })

    test('detects a list that still matches the regional defaults', () => {
        expect(hasDefaultWatchlist('us', ['.SPX', '@SP.1', '@CL.1', '@GC.1'])).toBe(true)
        expect(hasDefaultWatchlist('us', ['.SPX'])).toBe(false)
    })
})

describe('buildMarketQuoteUrl', () => {
    test('targets the keyless quote feed with a pipe-separated watchlist', () => {
        const url = buildMarketQuoteUrl(['.SPX', '@CL.1'])
        expect(url.startsWith('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?')).toBe(true)
        expect(url).toContain('symbols=.SPX%7C%40CL.1')
        expect(url).toContain('output=json')
    })
})

describe('formatting and labels', () => {
    test('formats small values with extra precision', () => {
        expect(formatMarketNumber(0.0123)).toBe('0.0123')
        expect(formatMarketNumber(7514.31)).toBe('7,514.31')
    })

    test('builds an accessible summary with direction and day range', () => {
        const [quote] = parseCnbcQuotes(payload)
        const label = buildMarketAriaLabel(quote)
        expect(label).toContain('S&P 500 Index')
        expect(label).toContain('7,514.31')
        expect(label).toContain('down 0.47%')
        expect(label).toContain('day range')
        expect(label).toContain('Regular')
        expect(label).toContain('as of')
        expect(label).not.toContain('EST')
        expect(label).toContain('USD')
    })

    test('catalog labels stay short enough for the board', () => {
        for (const instrument of Object.values(MARKET_CATALOG)) {
            expect(instrument.label.length).toBeLessThanOrEqual(16)
            expect(instrument.shortLabel.length).toBeGreaterThan(0)
            expect(instrument.shortLabel.length).toBeLessThanOrEqual(7)
            expect(instrument.name.length).toBeGreaterThan(0)
        }
    })
})
