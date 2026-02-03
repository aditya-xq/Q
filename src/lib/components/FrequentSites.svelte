<script lang="ts">
    import defaultFaviconSvg from '$lib/assets/default-favicon.svg?raw'

    let {sites = []} = $props()

    const DEFAULT_FAVICON = `data:image/svg+xml;utf8,${encodeURIComponent(defaultFaviconSvg)}`

    const MIN_FAVICON_SIZE = 32

    // Function to get the favicon for a site
    function getFavicon(url: string | URL) {
        try {
            const domain = new URL(url).hostname
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        } catch (e) {
            // Fallback icon if URL parsing fails
            return DEFAULT_FAVICON
        }
    }

    // Handle favicon loading errors
    function handleImageError(event: any) {
        const img = event.target as HTMLImageElement
        if (img.dataset.fallback === 'true') return

        img.dataset.fallback = 'true'
        img.src = DEFAULT_FAVICON
    }

    // Swap in the default icon when a low-res favicon loads
    function handleImageLoad(event: any) {
        const img = event.target as HTMLImageElement
        if (img.dataset.fallback === 'true') return

        if (img.naturalWidth < MIN_FAVICON_SIZE || img.naturalHeight < MIN_FAVICON_SIZE) {
            img.dataset.fallback = 'true'
            img.src = DEFAULT_FAVICON
        }
    }
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4 max-w-5xl mx-auto">
        {#each sites as site (site.title)}
            <a
                href={site.url}
                class="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-200"
                rel="noopener noreferrer"
            >
                <div class="relative w-12 h-12 md:w-14 md:h-14 mb-2 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                        src={getFavicon(site.url)}
                        alt={`${site.title} icon`}
                        class="w-8 h-8 md:w-10 md:h-10 object-contain"
                        onload={(e) => handleImageLoad(e)}
                        onerror={(e) => handleImageError(e)}
                    />
                </div>
                <span class="text-xs md:text-sm text-center text-slate-700 dark:text-slate-300 truncate w-full">
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
</style>
