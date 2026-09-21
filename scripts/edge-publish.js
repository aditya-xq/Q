import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'

// Microsoft Edge Add-ons Update REST API (v1.1).
// https://learn.microsoft.com/microsoft-edge/extensions/update/api/using-addons-api
const API_ROOT = 'https://api.addons.microsoftedge.microsoft.com'
const POLL_INTERVAL_MS = 5000
const POLL_ATTEMPTS = 120

const REQUIRED_ENV = ['EDGE_EXTENSION_PUBLISH_API_KEY', 'EDGE_EXTENSION_CLIENT_ID', 'EDGE_EXTENSION_PRODUCT_ID']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Edge Publish API credentials from the environment (Bun loads `.env` automatically). */
export function readEdgeCredentials() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
    return {
        apiKey: process.env.EDGE_EXTENSION_PUBLISH_API_KEY?.trim() ?? '',
        clientId: process.env.EDGE_EXTENSION_CLIENT_ID?.trim() ?? '',
        productId: process.env.EDGE_EXTENSION_PRODUCT_ID?.trim() ?? '',
        missing,
        complete: missing.length === 0,
    }
}

export function hasEdgeCredentials() {
    return readEdgeCredentials().complete
}

function authHeaders({ apiKey, clientId }) {
    return { Authorization: `ApiKey ${apiKey}`, 'X-ClientID': clientId }
}

/** The `Location` header holds the operation id (sometimes as a full URL); keep the last path segment. */
function operationIdFrom(response) {
    const location = response.headers.get('location') ?? ''
    return location.split('/').filter(Boolean).pop() ?? ''
}

async function readBody(response) {
    const text = await response.text().catch(() => '')
    try {
        return JSON.parse(text)
    } catch {
        return { message: text }
    }
}

function describeFailure(body) {
    const errors = Array.isArray(body.errors)
        ? body.errors.map((error) => (typeof error === 'string' ? error : error?.message)).filter(Boolean)
        : []
    return [body.message, body.errorCode, ...errors].filter(Boolean).join(' — ') || 'unknown error'
}

async function waitForOperation(url, headers, label, log) {
    for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS)
        const response = await fetch(url, { headers })
        const body = await readBody(response)
        if (body.status === 'Succeeded') return body
        // Treat `Failed` and the undocumented no-status response as terminal failures.
        if (body.status !== 'InProgress') {
            throw new Error(`${label} failed: ${describeFailure(body)}`)
        }
        if (attempt === 1 || attempt % 12 === 0) log(`… ${label} in progress (${attempt}/${POLL_ATTEMPTS})`)
    }
    throw new Error(`${label} timed out after ${POLL_ATTEMPTS} status checks`)
}

async function uploadPackage({ productId, ...credentials }, zipPath, log) {
    log(`📤 Uploading ${zipPath} to the Edge Add-ons store…`)
    const response = await fetch(`${API_ROOT}/v1/products/${productId}/submissions/draft/package`, {
        method: 'POST',
        headers: { ...authHeaders(credentials), 'Content-Type': 'application/zip' },
        body: readFileSync(zipPath),
    })
    if (response.status !== 202) {
        const body = await readBody(response)
        throw new Error(`Package upload rejected (HTTP ${response.status}): ${body.message ?? ''}`)
    }
    const operationId = operationIdFrom(response)
    if (!operationId) throw new Error('Package upload did not return an operation id')
    await waitForOperation(
        `${API_ROOT}/v1/products/${productId}/submissions/draft/package/operations/${operationId}`,
        authHeaders(credentials),
        'Package upload',
        log
    )
}

async function publishSubmission({ productId, ...credentials }, notes, log) {
    log('🚀 Submitting the draft for review…')
    const response = await fetch(`${API_ROOT}/v1/products/${productId}/submissions`, {
        method: 'POST',
        headers: { ...authHeaders(credentials), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    })
    if (response.status !== 202) {
        const body = await readBody(response)
        throw new Error(`Publish rejected (HTTP ${response.status}): ${body.message ?? ''}`)
    }
    const operationId = operationIdFrom(response)
    if (!operationId) throw new Error('Publish did not return an operation id')
    await waitForOperation(
        `${API_ROOT}/v1/products/${productId}/submissions/operations/${operationId}`,
        authHeaders(credentials),
        'Publish',
        log
    )
}

/** Upload `zipPath` and submit it for review at the Microsoft Edge Add-ons store. */
export async function publishToEdge({ zipPath = 'q-extension.zip', notes = '', log = console.log } = {}) {
    const credentials = readEdgeCredentials()
    if (!credentials.complete) {
        throw new Error(`Missing Edge credentials in .env: ${credentials.missing.join(', ')} (see .env.example)`)
    }
    if (!existsSync(zipPath)) {
        throw new Error(`Extension package not found: ${zipPath} — run \`bun run release\` first`)
    }
    await uploadPackage(credentials, zipPath, log)
    await publishSubmission(credentials, notes, log)
    log('✅ Edge Add-ons submission created (certification can take up to 7 business days).')
}

function packageVersion() {
    try {
        return JSON.parse(readFileSync('package.json', 'utf-8')).version ?? ''
    } catch {
        return ''
    }
}

if (import.meta.main) {
    const args = process.argv.slice(2)
    const notesFlag = args.indexOf('--notes')
    const notes = notesFlag >= 0 && args[notesFlag + 1] ? args[notesFlag + 1] : `Automated release v${packageVersion()}`

    // Make `bun run publish:edge` self-contained: build + package if the artifact is missing.
    if (!existsSync('q-extension.zip')) {
        execSync('bun run build:ext', { stdio: 'inherit' })
        execSync('bestzip q-extension.zip build-extension/*', { stdio: 'inherit' })
    }

    publishToEdge({ notes }).catch((error) => {
        console.error(`❌ ${error.message}`)
        process.exit(1)
    })
}
