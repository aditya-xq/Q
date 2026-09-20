import type { View } from '$lib/state.svelte'

export const VALID_VIEWS: ReadonlySet<View> = new Set<View>(['home', 'quick-panel', 'projects', 'writer'])

export function parseViewParam(value: string | null | undefined): View {
    if (!value) return 'home'
    const normalized = value.toLowerCase() as View
    return VALID_VIEWS.has(normalized) ? normalized : 'home'
}

export function getViewFromUrl(url: URL): View {
    return parseViewParam(url.searchParams.get('view'))
}
