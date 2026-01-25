import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

const isExtension = process.env.BUILD_TARGET === 'extension'

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        !isExtension &&
        SvelteKitPWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Q',
                short_name: 'Q',
                start_url: '/',
                display: 'standalone',
                background_color: '#000000',
                theme_color: '#000000',
                icons: [
                    { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            }
        })
    ].filter(Boolean)
})
