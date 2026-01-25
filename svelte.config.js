import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import chromeAdapter from 'sveltekit-adapter-chrome-extension'
import staticAdapter from '@sveltejs/adapter-static'

const isExtension = process.env.BUILD_TARGET === 'extension'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        appDir: 'app',
        adapter: isExtension
        ? chromeAdapter({
            // put extension artifacts into a dedicated folder
            pages: 'build-extension',
            assets: 'build-extension',
            // optionally pick a different manifest in your static/ dir
            manifest: 'manifest.json'
            })
        : staticAdapter({
            // web default
            pages: 'build',
            assets: 'build',
            fallback: 'index.html'
            }),
        prerender: {
        entries: ['*']
        }
    }
}

export default config
