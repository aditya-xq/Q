export function deriveTitle(fromContent: string, opts?: { maxTitleLength?: number; maxSentenceLength?: number; fallback?: string }) {
    const maxTitleLength = opts?.maxTitleLength ?? 28   // final title length (chars)
    const maxSentenceLength = opts?.maxSentenceLength ?? 120 // How far to search for a sentence end
    const fallback = opts?.fallback ?? 'Untitled'

    if (!fromContent) return fallback

    let s = fromContent.trim()
    if (!s) return fallback

    // 1. Remove YAML frontmatter (--- ... ---) often found in Markdown files
    s = s.replace(/^\s*---[\s\S]*?---\s*/m, '').trim()

    // 2. Take first block of text (stop at first blank line) - headings and the first paragraph are common titles
    const firstBlock = s.split(/\r?\n\s*\r?\n/)[0] ?? s

    // 3. From that block, take the first non-empty line (skip badges, images etc.)
    const lines = firstBlock.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return fallback
    let firstLine = lines.find(l => !/^(!\[.*\]\(.*\)|\[\\!\[.*\]\(.*\)\]|<!--)/.test(l)) ?? lines[0]

    // 4. Remove leading Markdown heading markers and list / quote markers
    firstLine = firstLine.replace(/^\s{0,3}(#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+)/, '').trim()

    // 5. Remove Markdown images entirely, convert links to their text, strip inline code and formatting
    //    - ![alt](url) -> ''
    //    - [text](url) -> text
    //    - `code` -> code
    //    - **bold**, *em*, ~~strike~~ -> plain text
    firstLine = firstLine
        .replace(/!\[.*?\]\(.*?\)/g, '')                      // images
        .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, (_, t) => t)   // links -> title
        .replace(/`([^`]+)`/g, (_, t) => t)                  // inline code
        .replace(/(\*\*|__)(.*?)\1/g, (_, __, t) => t)       // bold
        .replace(/(\*|_)(.*?)\1/g, (_, __, t) => t)          // emphasis
        .replace(/~~(.*?)~~/g, (_, t) => t)                  // strikethrough
        .replace(/<\/?[^>]+>/g, '')                         // remove any HTML tags
        .replace(/\bhttps?:\/\/\S+\b/g, '')                  // remove naked URLs
        .replace(/\s+/g, ' ')                                // collapse spaces
        .trim()

    // 6. Decode a few common HTML entities so titles look nice
    firstLine = firstLine
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

    if (!firstLine) return fallback

    // 7. Try to capture a clean sentence (first sentence ending with . ? !) within reasonable length
    const sentenceMatch = firstLine.slice(0, maxSentenceLength).match(/^(.+?[.?!])(?:\s|$)/)
    const candidate = sentenceMatch ? sentenceMatch[1] : firstLine

    // 8. Truncate but prefer not to cut mid-word; if truncation happens, append ellipsis
    function truncatePreserveWords(str: string, maxLen: number) {
        str = str.trim()
        if (str.length <= maxLen) return str
        // take up to maxLen, then backtrack to last space within a small window to avoid chopping words
        const truncated = str.slice(0, maxLen)
        const lastSpace = truncated.lastIndexOf(' ')
        if (lastSpace > Math.floor(maxLen * 0.6)) {
        return truncated.slice(0, lastSpace).trim() + '…'
        }
        // if there's no decent space, fallback to a hard cut with ellipsis
        return truncated.trim() + '…'
    }

    const title = truncatePreserveWords(candidate.replace(/^[\s\W]+|[\s\W]+$/g, ''), maxTitleLength)

    // 9. Final sanity checks
    if (!title || /^[-_~`!@#\\$%^&*()+=\\[\]{}|\\<>\\/]+$/.test(title)) return fallback

    return title
}

export function clickOutside(node: HTMLElement, callback: () => void) {
    const handleClick = (event: MouseEvent) => {
        // If the click is outside the node
        if (!node.contains(event.target as Node)) {
            callback()
        }
    }

    document.addEventListener("click", handleClick, true)

    return {
        destroy() {
            document.removeEventListener("click", handleClick, true)
        }
    }
}
