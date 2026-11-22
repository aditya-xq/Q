<script lang="ts">
    import defaultFaviconSvg from '$lib/assets/default-favicon.svg?raw'
    import { getFaviconUrl } from '$lib/utils/constants'

    let { sites = [] } = $props<{ sites?: { url: string; title: string }[] }>()

    const DEFAULT_FAVICON = `data:image/svg+xml;utf8,${encodeURIComponent(defaultFaviconSvg)}`

    const MIN_FAVICON_SIZE = 32

    // Handle favicon loading errors
    function handleImageError(event: Event) {
        const img = event.target as HTMLImageElement
        if (img.dataset.fallback === 'true') return

        img.dataset.fallback = 'true'
        img.src = DEFAULT_FAVICON
    }

    // Swap in the default icon when a low-res favicon loads
    function handleImageLoad(event: Event) {
        const img = event.target as HTMLImageElement
        if (img.dataset.fallback === 'true') return

        if (img.naturalWidth < MIN_FAVICON_SIZE || img.naturalHeight < MIN_FAVICON_SIZE) {
            img.dataset.fallback = 'true'
            img.src = DEFAULT_FAVICON
        }
    }
</script>

<div class="flex justify-center" data-testid="frequent-sites">
    <div class="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4 max-w-5xl mx-auto">
        {#each sites as site (site.url)}
            <a
                href={site.url}
                class="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg hover:bg-surface-2 transition-colors duration-200"
                aria-label={site.title}
                data-tooltip={site.title}
                data-tooltip-position="top"
                data-tooltip-wrap
                rel="external noopener noreferrer"
            >
                <div
                    class="relative w-12 h-12 md:w-14 md:h-14 mb-2 rounded-full overflow-hidden flex items-center justify-center"
                >
                    <img
                        src={getFaviconUrl(site.url)}
                        alt={`${site.title} icon`}
                        class="w-8 h-8 md:w-10 md:h-10 object-contain"
                        onload={handleImageLoad}
                        onerror={handleImageError}
                    />
                </div>
                <span class="text-xs md:text-sm text-center text-fg-muted truncate w-full">
                    {site.title}
                </span>
            </a>
        {/each}
    </div>
</div>

<style>
    /* Add subtle hover effects */
    a:hover {
        transform: translateY(-2px);
        transition: transform 0.2s ease;
    }

    /* Each half of a row opens its tooltip inwards, so a wide bubble never
       pushes past the viewport edge. The breakpoints use rem so they track the
       grid's Tailwind `md` (48rem) at any default font size. */
    @media (max-width: 47.99rem) {
        a[data-tooltip]:nth-child(4n + 1)::before,
        a[data-tooltip]:nth-child(4n + 1)::after,
        a[data-tooltip]:nth-child(4n + 2)::before,
        a[data-tooltip]:nth-child(4n + 2)::after {
            left: 0;
            right: auto;
            transform: none;
        }

        a[data-tooltip]:nth-child(4n + 3)::before,
        a[data-tooltip]:nth-child(4n + 3)::after,
        a[data-tooltip]:nth-child(4n)::before,
        a[data-tooltip]:nth-child(4n)::after {
            left: auto;
            right: 0;
            transform: none;
        }
    }

    @media (min-width: 48rem) {
        a[data-tooltip]:nth-child(8n + 1)::before,
        a[data-tooltip]:nth-child(8n + 1)::after,
        a[data-tooltip]:nth-child(8n + 2)::before,
        a[data-tooltip]:nth-child(8n + 2)::after,
        a[data-tooltip]:nth-child(8n + 3)::before,
        a[data-tooltip]:nth-child(8n + 3)::after,
        a[data-tooltip]:nth-child(8n + 4)::before,
        a[data-tooltip]:nth-child(8n + 4)::after {
            left: 0;
            right: auto;
            transform: none;
        }

        a[data-tooltip]:nth-child(8n + 5)::before,
        a[data-tooltip]:nth-child(8n + 5)::after,
        a[data-tooltip]:nth-child(8n + 6)::before,
        a[data-tooltip]:nth-child(8n + 6)::after,
        a[data-tooltip]:nth-child(8n + 7)::before,
        a[data-tooltip]:nth-child(8n + 7)::after,
        a[data-tooltip]:nth-child(8n)::before,
        a[data-tooltip]:nth-child(8n)::after {
            left: auto;
            right: 0;
            transform: none;
        }
    }
</style>
