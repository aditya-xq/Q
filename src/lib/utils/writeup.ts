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
