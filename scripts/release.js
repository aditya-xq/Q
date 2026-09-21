import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { hasEdgeCredentials, publishToEdge } from './edge-publish.js'

// Helper to run commands
const run = (command) => {
    console.log(`> ${command}`)
    execSync(command, { stdio: 'inherit' })
}

const skipEdge = process.argv.includes('--skip-edge')

try {
    // 1. Get version from package.json
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    const version = packageJson.version

    if (!version) {
        throw new Error('Version not found in package.json')
    }

    const tagName = `v${version}`
    console.log(`📦 Preparing release for tag: ${tagName}`)

    // 2. Keep static/manifest.json version in sync with package.json
    const manifestPath = path.resolve(process.cwd(), 'static/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    if (manifest.version !== version) {
        console.log(`↻ Syncing manifest version ${manifest.version} -> ${version}`)
        manifest.version = version
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)
        run('git add static/manifest.json')
        run(`git commit -m "chore(release): sync manifest version to ${tagName}"`)
    }

    // 3. Require a clean working tree so the tagged commit matches the build
    const dirty = execSync('git status --porcelain').toString().trim()
    if (dirty) {
        throw new Error(`Working tree is not clean:\n${dirty}\nCommit or stash changes before releasing.`)
    }

    // 4. Clean + Build both targets
    run('bun run build:web')
    run('bun run build:ext')

    // 5. Package artifacts
    const webZip = 'q-web.zip'
    const extZip = 'q-extension.zip'

    run(`bestzip ${webZip} build/*`)
    run(`bestzip ${extZip} build-extension/*`)

    // 6. Create and push the Git tag
    run(`git tag ${tagName}`)
    run(`git push origin ${tagName}`)

    // 7. Create GitHub release with both artifacts
    run(`gh release create ${tagName} ${webZip} ${extZip} --generate-notes`)

    // 8. Publish the extension to the Microsoft Edge Add-ons store
    if (skipEdge) {
        console.log('⏭️  Skipping Edge publish (--skip-edge)')
    } else if (!hasEdgeCredentials()) {
        console.log('⚠️  Skipping Edge publish: set the EDGE_EXTENSION_* credentials in .env (see .env.example)')
    } else {
        try {
            await publishToEdge({ zipPath: extZip, notes: `Automated release ${tagName}` })
        } catch (error) {
            console.error(`❌ Edge store publish failed: ${error.message}`)
            console.error(`   The GitHub release ${tagName} is already published. Retry with: bun run publish:edge`)
            process.exit(1)
        }
    }

    console.log(`✅ Release ${tagName} created successfully!`)
} catch (error) {
    console.error(`❌ Release script failed: ${error.message}`)
    process.exit(1)
}
