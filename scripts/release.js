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

    // 2. Build the project
    run('bun run build')

    // 3. Create the zip file from the build directory
    run('bestzip build.zip build/*')

    // 4. Create and push the Git tag
    run(`git tag ${tagName}`)
    run(`git push origin ${tagName}`)

    // 5. Create the GitHub release with the zip file
    run(`gh release create ${tagName} build.zip --generate-notes`)

    console.log(`✅ Release ${tagName} created successfully!`)

} catch (error) {
    console.error(`❌ Release script failed: ${error.message}`)
    process.exit(1)
}
