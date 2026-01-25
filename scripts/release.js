import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

// Helper to run commands
const run = (command) => {
    console.log(`> ${command}`)
    execSync(command, { stdio: 'inherit' })
}

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

    // 2. Clean + Build both targets
    run('bun run build:web')
    run('bun run build:ext')

    // 3. Package artifacts
    const webZip = `q-web-${version}.zip`
    const extZip = `q-extension-${version}.zip`

    run(`bestzip ${webZip} build/*`)
    run(`bestzip ${extZip} build-extension/*`)

    // 4. Create and push the Git tag
    run(`git tag ${tagName}`)
    run(`git push origin ${tagName}`)

    // 5. Create GitHub release with both artifacts
    run(`gh release create ${tagName} ${webZip} ${extZip} --generate-notes`)

    console.log(`✅ Release ${tagName} created successfully!`)

} catch (error) {
    console.error(`❌ Release script failed: ${error.message}`)
    process.exit(1)
}
