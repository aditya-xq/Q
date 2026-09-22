import { existsSync, unlinkSync } from 'node:fs'
import { relative, resolve } from 'node:path'

/**
 * `static/` is shared by both build targets, so the static (PWA) build copies the MV3-only
 * files too. Remove them from `build/` so the web output stays a plain PWA and cannot be
 * loaded as an unpacked extension (which would fail on the MV3 inline-script CSP).
 */

const buildDir = resolve(process.argv[2] ?? 'build')
const mv3Only = ['manifest.json', 'background.js']

for (const file of mv3Only) {
    const target = resolve(buildDir, file)
    if (!existsSync(target)) continue
    unlinkSync(target)
    console.log(`Removed MV3-only asset from web build: ${relative(process.cwd(), target)}`)
}
