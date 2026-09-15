import type { QuickLink } from './db'

export interface QuickLinkCategoryConfig {
    title: string
    icon: string
    apps: string[]
    urls: Record<string, string>
}

export const QUICK_TODO_PROJECT_ID = -1

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

export const LINK_ICONS: Record<string, string> = {
    Gmail: 'https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63',
    WhatsApp: 'https://static.whatsapp.net/rsrc.php/v3/yz/r/ujTY9i_Jhs1.png',
    Telegram: 'https://telegram.org/img/t_logo.png',
    Netflix: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png',
    ChatGPT: 'https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png',
    Claude: 'https://claude.ai/images/claude_app_icon.png',
    Gemini: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    X: 'https://abs.twimg.com/favicons/twitter.3.ico',
    Instagram: 'https://static.cdninstagram.com/rsrc.php/v3/yt/r/30PrGfR3xhB.png',
    Reddit: 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
    GitHub: 'https://github.githubassets.com/favicons/favicon.png',
}

export const FAVICON_FALLBACK = 'https://www.google.com/s2/favicons?domain=example.com&sz=32'

export function getQuickLinkIcon(name: string, url: string): string {
    if (LINK_ICONS[name]) return LINK_ICONS[name]
    try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
    } catch {
        return FAVICON_FALLBACK
    }
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
