import { onMount } from 'svelte'

/** Reactive `window.matchMedia` wrapper. Call during component init. */
export function createMediaQuery(query: string): { readonly matches: boolean } {
    let matches = $state(false)

    onMount(() => {
        const media = window.matchMedia(query)
        matches = media.matches
        const onChange = () => {
            matches = media.matches
        }
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    })

    return {
        get matches() {
            return matches
        },
    }
}
