export function deriveTitle(fromContent: string) {
    if (!fromContent) return 'Untitled'
    // strip leading Markdown '#' or spaces
    const lines = fromContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return 'Untitled'
    const first = lines[0].replace(/^#+\s*/, '') // Drop Markdown heading markers
    // take up to first sentence or 60 chars
    const sentenceMatch = first.match(/^(.{1,120}?[\\.\\?\\!])(\s|$)/)
    if (sentenceMatch) return sentenceMatch[1].slice(0, 120)
    return first.slice(0, 80)
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
