import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

const isExtension = process.env.BUILD_TARGET === 'extension'
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
    version: string
}

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
        tailwindcss(),
        sveltekit(),
        !isExtension &&
            SvelteKitPWA({
                registerType: 'autoUpdate',
                manifest: {
                    id: '/',
                    name: 'Q - Your Productive New Tab',
                    short_name: 'Q',
                    description:
                        'Turn every new tab into a focused productivity hub: projects and a distraction-free writer.',
                    lang: 'en',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    orientation: 'any',
                    categories: ['productivity', 'utilities'],
                    background_color: '#000000',
                    theme_color: '#000000',
                    icons: [
                        { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                        { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
                        {
                            src: '/icons/android-chrome-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
            }),
    ].filter(Boolean),
})
