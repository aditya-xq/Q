<script lang="ts">
    let {sites = []} = $props()

    // Function to get the favicon for a site
    function getFavicon(url: string | URL) {
        try {
            const domain = new URL(url).hostname
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        } catch (e) {
            // Fallback icon if URL parsing fails
            return '/favicon.png'
        }
    }

    // Function to get site initial if favicon fails to load
    function getInitial(title: string) {
        return title ? title.charAt(0).toUpperCase() : '?'
    }

    // Handle favicon loading errors
    function handleImageError(event: any) {
        event.target.style.display = 'none'
        event.target.nextElementSibling.style.display = 'flex'
    }
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 max-w-5xl mx-auto">
        {#each sites as site}
            <a
                href={site.url}
                class="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-200"
                rel="noopener noreferrer"
            >
                <div class="relative w-14 h-14 mb-2 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                        src={getFavicon(site.url)}
                        alt={site.title}
                        class="w-10 h-10 object-contain"
                        onerror={(e) => handleImageError(e)}
                    />
                    <div
                        class="absolute inset-0 flex items-center justify-center text-lg font-semibold text-slate-600 dark:text-slate-300"
                        style="display: none"
                    >
                        {getInitial(site.title)}
                    </div>
                </div>
                <span class="text-sm text-center text-slate-700 dark:text-slate-300 truncate w-full">
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
