import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(join(root, path), 'utf8')) as T
}

interface Manifest {
    version: string
    web_accessible_resources?: unknown
}

describe('extension manifest', () => {
    test('matches the package version', () => {
        const pkg = readJson<{ version: string }>('package.json')
        const manifest = readJson<Manifest>('static/manifest.json')
        expect(manifest.version).toBe(pkg.version)
    })

    test('does not expose assets to every origin', () => {
        // The extension only loads its icons from its own pages, so a broad
        // web_accessible_resources entry is unnecessary fingerprinting surface.
        expect(readJson<Manifest>('static/manifest.json').web_accessible_resources).toBeUndefined()
    })
})
