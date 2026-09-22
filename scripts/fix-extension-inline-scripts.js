import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'

/**
 * MV3 forbids inline scripts in extension pages: the `extension_pages` CSP only allows
 * `'self'`, `'none'`, `'wasm-unsafe-eval'` (hashes and nonces are rejected). The SvelteKit
 * build always emits an inline bootstrap script, and `app.html` adds a theme pre-paint script.
 * Both must be externalized or the page never hydrates.
 *
 * The `sveltekit-adapter-chrome-extension` adapter tries to do this but only rewrites the first
 * inline script and fails once a second one exists, so we run this afterwards to cover the rest.
 */

const buildDir = resolve(process.argv[2] ?? 'build-extension')
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const SRC_RE = /<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["'][^>]*>/gi
const JS_TYPES = new Set([
    '',
    'module',
    'text/javascript',
    'application/javascript',
    'application/ecmascript',
    'text/ecmascript',
    'application/x-javascript',
])

function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return walk(full)
        return entry.isFile() ? [full] : []
    })
}

function hash(content) {
    return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

function scriptType(attrs) {
    const match = /\btype\s*=\s*["']([^"']*)["']/i.exec(attrs)
    return match ? match[1].trim().toLowerCase() : ''
}

const htmlFiles = walk(buildDir).filter((file) => file.endsWith('.html'))

for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8')
    const dir = dirname(file)
    let changed = false

    const rewritten = html.replace(SCRIPT_RE, (match, attrs, body) => {
        if (/\ssrc\s*=/.test(attrs)) return match
        if (!body.trim()) return match
        if (!JS_TYPES.has(scriptType(attrs))) return match

        const name = `script-${hash(body)}.js`
        writeFileSync(join(dir, name), body)
        changed = true
        return `<script${attrs} src="./${name}"></script>`
    })

    if (changed) {
        writeFileSync(file, rewritten)
        console.log(`Externalized inline scripts in ${relative(process.cwd(), file)}`)
    }
}

// Collect every script src from the final HTML (ours and the adapter's) so cleanup never
// removes a file a page still references.
const referenced = new Set()
for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8')
    for (const [, src] of html.matchAll(SRC_RE)) {
        const clean = src.split(/[?#]/)[0]
        referenced.add(clean.startsWith('/') ? resolve(buildDir, `.${clean}`) : resolve(dirname(file), clean))
    }
}

for (const file of walk(buildDir)) {
    if (!/^script-[a-z0-9]+\.js$/i.test(basename(file))) continue
    if (referenced.has(resolve(file))) continue
    unlinkSync(file)
    console.log(`Removed orphan inline script ${relative(process.cwd(), file)}`)
}

const remaining = htmlFiles
    .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(SCRIPT_RE)])
    .filter(([, attrs, body]) => !/\ssrc\s*=/.test(attrs) && body.trim().length > 0 && JS_TYPES.has(scriptType(attrs)))

if (remaining.length > 0) {
    throw new Error(`Found ${remaining.length} inline script(s) that MV3 will block`)
}
