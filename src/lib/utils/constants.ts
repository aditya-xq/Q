import type { QuickLink } from './db'

export interface QuickLinkCategoryConfig {
    title: string
    icon: string
    apps: string[]
    urls: Record<string, string>
}

export const QUICK_LINK_CATEGORIES = ['Email', 'Messaging', 'OTT', 'AI', 'Social', 'Custom'] as const

export const CATEGORY_CONFIGS: QuickLinkCategoryConfig[] = [
    {
        title: 'Email',
        icon: '✉️',
        apps: ['Gmail', 'Outlook', 'Other'],
        urls: { Gmail: 'https://mail.google.com', Outlook: 'https://outlook.live.com' },
    },
    {
        title: 'Messaging',
        icon: '💬',
        apps: ['WhatsApp', 'Telegram', 'Other'],
        urls: { WhatsApp: 'https://web.whatsapp.com', Telegram: 'https://web.telegram.org' },
    },
    {
        title: 'OTT',
        icon: '📺',
        apps: ['Netflix', 'Prime', 'Other'],
        urls: { Netflix: 'https://www.netflix.com', Prime: 'https://www.primevideo.com' },
    },
    {
        title: 'AI',
        icon: '🤖',
        apps: ['ChatGPT', 'Claude', 'Gemini', 'Other'],
        urls: {
            ChatGPT: 'https://chatgpt.com',
            Claude: 'https://claude.ai',
            Gemini: 'https://gemini.google.com',
        },
    },
    {
        title: 'Social',
        icon: '🌐',
        apps: ['X', 'Instagram', 'Reddit', 'Other'],
        urls: {
            X: 'https://x.com',
            Instagram: 'https://www.instagram.com',
            Reddit: 'https://www.reddit.com',
        },
    },
    {
        title: 'Custom',
        icon: '🔗',
        apps: ['Techflix', 'GitHub', 'Other'],
        urls: { Techflix: 'https://techflix.club', GitHub: 'https://github.com' },
    },
]

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
    { category: 'Email', name: 'Gmail', url: 'https://mail.google.com' },
    { category: 'Messaging', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
    { category: 'OTT', name: 'Netflix', url: 'https://www.netflix.com' },
    { category: 'AI', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { category: 'Social', name: 'X', url: 'https://x.com' },
    { category: 'Custom', name: 'Techflix', url: 'https://techflix.club' },
]

// Brand marks ship with the app (static/icons/brands) so the rail renders offline
// and never breaks when a vendor moves or retires its hosted logo.
// Sources: official site favicons/brand assets — ssl.gstatic.com (Gmail), Wikimedia (WhatsApp),
// google.com/s2 (Instagram), telegram.org, nflxext.com, oaistatic.com, claude.ai, gstatic.com
// (Gemini), abs.twimg.com (X), redditstatic.com, githubassets.com.
const BRAND_ICON_DIR = '/icons/brands'

export const LINK_ICONS: Record<string, string> = {
    Gmail: `${BRAND_ICON_DIR}/gmail.ico`,
    WhatsApp: `${BRAND_ICON_DIR}/whatsapp.svg`,
    Telegram: `${BRAND_ICON_DIR}/telegram.png`,
    Netflix: `${BRAND_ICON_DIR}/netflix.png`,
    ChatGPT: `${BRAND_ICON_DIR}/chatgpt.png`,
    Claude: `${BRAND_ICON_DIR}/claude.png`,
    Gemini: `${BRAND_ICON_DIR}/gemini.svg`,
    X: `${BRAND_ICON_DIR}/x.ico`,
    Instagram: `${BRAND_ICON_DIR}/instagram.png`,
    Reddit: `${BRAND_ICON_DIR}/reddit.png`,
    GitHub: `${BRAND_ICON_DIR}/github.png`,
}

/** Neutral chain-link mark shown when an icon cannot be loaded at all. */
export const FALLBACK_ICON = `${BRAND_ICON_DIR}/link.svg`

/** Google favicon proxy for a link's own host, used for custom/unknown links. */
export function getFaviconUrl(url: string): string {
    try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    } catch {
        return FALLBACK_ICON
    }
}

export function getQuickLinkIcon(name: string, url: string): string {
    return LINK_ICONS[name] ?? getFaviconUrl(url)
}

export function extractNameFromUrl(url: string): string {
    if (!url) return 'Custom Link'
    try {
        let normalized = url.trim()
        if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`
        const hostname = new URL(normalized).hostname.replace(/^www\./, '')
        const parts = hostname.split('.')
        const main = parts.length > 2 ? parts[parts.length - 2] : parts[0]
        return main.charAt(0).toUpperCase() + main.slice(1)
    } catch {
        return 'Custom Link'
    }
}

export function normalizeUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
