type CommandMode = 'strict' | 'assist'

type TextRule = {
    pattern: RegExp
    replacement: string | ((substring: string, ...groups: string[]) => string)
}

const PUNCTUATION_RULES: TextRule[] = [
    { pattern: /\bcomma\b/gi, replacement: ',' },
    { pattern: /\bperiod\b|\bfull stop\b/gi, replacement: '.' },
    { pattern: /\bquestion mark\b/gi, replacement: '?' },
    { pattern: /\bexclamation mark\b|\bexclamation point\b/gi, replacement: '!' },
    { pattern: /\bsemicolon\b/gi, replacement: ';' },
    { pattern: /\bcolon\b/gi, replacement: ':' },
    { pattern: /\bopen quote\b/gi, replacement: '"' },
    { pattern: /\bclose quote\b/gi, replacement: '"' },
    { pattern: /\bopen parenthesis\b|\bopen bracket\b/gi, replacement: '(' },
    { pattern: /\bclose parenthesis\b|\bclose bracket\b/gi, replacement: ')' },
    { pattern: /\bopen square bracket\b/gi, replacement: '[' },
    { pattern: /\bclose square bracket\b/gi, replacement: ']' },
    { pattern: /\bopen brace\b/gi, replacement: '{' },
    { pattern: /\bclose brace\b/gi, replacement: '}' },
]

const STRUCTURE_RULES: TextRule[] = [
    {
        pattern: /(?:\b(?:new|next)\s+paragraph\b)(?:[ \t]*[.,;:!?])*/gi,
        replacement: '\n\n',
    },
    {
        pattern: /(?:\b(?:new|next)\s+line\b|\bline break\b|\bnewline\b)(?:[ \t]*[.,;:!?])*/gi,
        replacement: '\n',
    },
    {
        pattern: /\b(?:horizontal rule|insert rule|insert separator)\b(?:[ \t]*[.,;:!?])*/gi,
        replacement: '\n---\n',
    },
]

const MARKDOWN_LINE_RULES: TextRule[] = [
    { pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading one|heading 1|h1)\b(?:[ \t]*[:\-.,;!?])*/gi, replacement: '# ' },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading two|heading 2|h2)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '## ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading three|heading 3|h3)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '### ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading four|heading 4|h4)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '#### ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading five|heading 5|h5)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '##### ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:heading six|heading 6|h6)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '###### ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:bullet point|bullet|list item|unordered item)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '- ',
    },
    {
        pattern:
            /(^|\n)[ \t]*(?:new[ \t]+)?(?:numbered item|numbered list item|ordered item|numbered point)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '1. ',
    },
    {
        pattern:
            /(^|\n)[ \t]*(?:new[ \t]+)?(?:task item|todo item|unchecked task|checklist item)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '- [ ] ',
    },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:checked task|completed task|done item)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '- [x] ',
    },
    { pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:quote|block quote)\b(?:[ \t]*[:\-.,;!?])*/gi, replacement: '> ' },
    {
        pattern: /(^|\n)[ \t]*(?:new[ \t]+)?(?:table row|row start)\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '| ',
    },
]

const INLINE_RULES: TextRule[] = [
    {
        pattern: /\bbold\s+(.+?)\s+end bold\b/gi,
        replacement: (_match, text: string) => `**${text.trim()}**`,
    },
    {
        pattern: /\bitalic\s+(.+?)\s+end italic\b/gi,
        replacement: (_match, text: string) => `*${text.trim()}*`,
    },
    {
        pattern: /\bstrikethrough\s+(.+?)\s+end strikethrough\b/gi,
        replacement: (_match, text: string) => `~~${text.trim()}~~`,
    },
    {
        pattern: /\binline code\s+(.+?)\s+end code\b/gi,
        replacement: (_match, text: string) => `\`${text.trim()}\``,
    },
    {
        pattern: /\blink text\s+(.+?)\s+link url\s+(\S+)\b/gi,
        replacement: (_match, label: string, url: string) => `[${label.trim()}](${normalizeVoiceUrl(url)})`,
    },
    {
        pattern: /\blink\s+(.+?)\s+to\s+(\S+)\b/gi,
        replacement: (_match, label: string, url: string) => `[${label.trim()}](${normalizeVoiceUrl(url)})`,
    },
    { pattern: /\bstart bold\b/gi, replacement: '**' },
    { pattern: /\bend bold\b/gi, replacement: '**' },
    { pattern: /\bstart italic\b/gi, replacement: '*' },
    { pattern: /\bend italic\b/gi, replacement: '*' },
    { pattern: /\bstart strike\b|\bstart strikethrough\b/gi, replacement: '~~' },
    { pattern: /\bend strike\b|\bend strikethrough\b/gi, replacement: '~~' },
    { pattern: /\bstart inline code\b|\bstart code span\b/gi, replacement: '`' },
    { pattern: /\bend inline code\b|\bend code span\b/gi, replacement: '`' },
]

const CODE_FENCE_RULES: TextRule[] = [
    {
        pattern:
            /\b(?:start|open|begin)\s+code(?:[ \t]+block)?(?:[ \t]+in[ \t]+([a-z0-9+#.-]+))?\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: (_match, language?: string) => {
            const normalizedLanguage = String(language ?? '')
                .trim()
                .toLowerCase()
            return normalizedLanguage ? `\n\`\`\`${normalizedLanguage}\n` : '\n```\n'
        },
    },
    {
        pattern: /\b(?:end|close|finish)\s+code(?:[ \t]+block)?\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '\n```\n',
    },
]

const TABLE_RULES: TextRule[] = [
    { pattern: /\bnext column\b(?:[ \t]*[:\-.,;!?])*/gi, replacement: ' | ' },
    { pattern: /\bend row\b(?:[ \t]*[:\-.,;!?])*/gi, replacement: ' |\n' },
    {
        pattern: /\btable header separator\b(?:[ \t]*[:\-.,;!?])*/gi,
        replacement: '| --- | --- |\n',
    },
]

function applyRules(text: string, rules: TextRule[]) {
    let next = text
    for (const rule of rules) {
        if (typeof rule.replacement === 'string') {
            next = next.replace(rule.pattern, rule.replacement)
        } else {
            next = next.replace(rule.pattern, rule.replacement)
        }
    }
    return next
}

function applyMarkdownLineCommands(text: string) {
    let next = text
    for (const rule of MARKDOWN_LINE_RULES) {
        next = next.replace(rule.pattern, (_match, lineStart: string) => `${lineStart}${rule.replacement}`)
    }
    return next
}

function autoFormatByContext(text: string) {
    return text
        .replace(/(^|\n)[ \t]*(\d+)[)-][ \t]+/g, '$1$2. ')
        .replace(/(^|\n)[ \t]*(?:dash|hyphen)[ \t]+/g, '$1- ')
        .replace(/(^|\n)[ \t]*greater than[ \t]+/gi, '$1> ')
}

function normalizeVoiceUrl(url: string) {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
}

function applyMarkdownCommands(text: string, commandMode: CommandMode) {
    let next = text
    next = applyRules(next, STRUCTURE_RULES)
    next = applyMarkdownLineCommands(next)
    next = applyRules(next, CODE_FENCE_RULES)
    next = applyRules(next, TABLE_RULES)
    next = applyRules(next, INLINE_RULES)

    if (commandMode === 'assist') {
        next = autoFormatByContext(next)
    }

    return next
}

function cleanupCommandArtifacts(text: string) {
    return text
        .replace(/\n[ \t]*[.,;:!?]+(?=\n|$)/g, '\n')
        .replace(/(^|\n)(#{1,6}|-|\*|>|\d+\.|- \[ \]|- \[x\]|```|\|)[ \t]*[.,;:!?]+(?=\n|$)/gi, '$1$2')
        .replace(/`{3,}\n{2,}`{3,}/g, '```\n```')
}

function normalizeWhitespace(text: string) {
    return text
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+([,.;!?])/g, '$1')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[ \t]+/g, '')
        .replace(/[ \t]+$/g, '')
}

function isBoundaryCharacter(char: string | undefined) {
    if (!char) return true
    return /\s|[,.!?;:()[\]{}"'\-*`>]/.test(char)
}

function dedupeTail(previousText: string, nextText: string) {
    if (!previousText || !nextText) return nextText

    const normalizedPrevious = previousText.toLowerCase()
    const normalizedNext = nextText.toLowerCase()
    const maxProbe = Math.min(normalizedPrevious.length, normalizedNext.length, 120)
    for (let i = maxProbe; i > 10; i -= 1) {
        const prevTail = normalizedPrevious.slice(-i)
        const nextHead = normalizedNext.slice(0, i)
        if (!prevTail || prevTail !== nextHead) continue

        const previousBoundary = normalizedPrevious[normalizedPrevious.length - i - 1]
        const nextBoundary = normalizedNext[i]
        if (isBoundaryCharacter(previousBoundary) && isBoundaryCharacter(nextBoundary)) {
            return nextText.slice(i).trimStart()
        }
    }

    return nextText
}

export function normalizeVoiceText(text: string, autoPunctuation: boolean, commandMode: CommandMode = 'assist') {
    if (!text) return ''

    let next = text
    if (autoPunctuation) {
        next = applyRules(next, PUNCTUATION_RULES)
    }

    next = applyMarkdownCommands(next, commandMode)
    next = cleanupCommandArtifacts(next)

    return normalizeWhitespace(next)
}

export function mergeVoiceSegment(previousCommitted: string, nextSegment: string) {
    return dedupeTail(previousCommitted, nextSegment)
}

export function isPunctuationOnlyVoiceSegment(segment: string) {
    const trimmed = segment.trim()
    return !!trimmed && /^[,.;:!?]+$/.test(trimmed)
}

export function isStructuralVoiceSegment(segment: string) {
    if (!segment) return false
    if (/^\n{1,2}$/.test(segment)) return true

    const withoutLeadingBreaks = segment.replace(/^\n+/, '').trim()
    return (
        /^(#{1,6})$/.test(withoutLeadingBreaks) ||
        withoutLeadingBreaks === '-' ||
        withoutLeadingBreaks === '*' ||
        withoutLeadingBreaks === '- [ ]' ||
        withoutLeadingBreaks === '- [x]' ||
        /^\d+\.$/.test(withoutLeadingBreaks) ||
        withoutLeadingBreaks === '>' ||
        withoutLeadingBreaks === '```' ||
        withoutLeadingBreaks === '---' ||
        withoutLeadingBreaks === '|'
    )
}
