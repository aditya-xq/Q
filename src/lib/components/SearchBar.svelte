<script lang="ts">
    import { onMount } from 'svelte'
    
    let searchQuery = $state('')
    let inputElement: HTMLInputElement
    
    function handleSearch(e: { preventDefault: () => void; }) {
        e.preventDefault()
        if (searchQuery.trim()) {
            // Redirect to Perplexity with the search query
            window.location.href = `https://perplexity.ai/search?q=${encodeURIComponent(searchQuery)}`
        }
    }
    
    onMount(() => {
        // Auto-focus the search input when the component mounts
        if (inputElement) {
            inputElement.focus()
        }
    })
</script>

<form onsubmit={handleSearch} class="w-full max-w-3xl mx-auto">
    <div class="relative flex items-center">
        <div class="absolute left-4 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        <input
            bind:this={inputElement}
            bind:value={searchQuery}
            type="text"
            placeholder="Search with Perplexity..."
            class="w-full pl-12 pr-16 py-4 text-base rounded-full border border-gray-200 hover:border-gray-300 hover:shadow-md focus:shadow-md focus:outline-none focus:border-gray-300 transition-all duration-200"
        />
    </div>
</form>