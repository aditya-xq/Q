import { deriveTitle } from './utils'
import type { Writeup, WriteupSummary } from './db'

export const WRITEUP_TITLE_FALLBACK = 'Untitled Draft'

export function deriveWriteupTitle(content: string): string {
    return deriveTitle(content, { fallback: WRITEUP_TITLE_FALLBACK })
}

/** Projects a stored write-up to the lightweight summary held in app state. */
export function toWriteupSummary(writeup: Writeup): WriteupSummary {
    return {
        id: writeup.id as number,
        title: writeup.title || deriveWriteupTitle(writeup.content),
        updatedAt: writeup.updatedAt,
        createdAt: writeup.createdAt,
    }
}

/** Counts the words of a markdown draft, ignoring code and formatting syntax. */
export function countWords(content: string): number {
    if (!content) return 0

    const text = content
        .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
        .replace(/`[^`]*`/g, ' ') // inline code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> label
        .replace(/<[^>]+>/g, ' ') // inline html
        .replace(/[*_~#>|]+/g, ' ') // formatting markers

    return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0
}
