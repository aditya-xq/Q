<script lang="ts">
    import { loadWriteups } from '$lib/utils/stores'
    import { onMount } from 'svelte'
    import { appState } from '$lib/state.svelte'
    import { Editor } from '.'

    onMount(() => {
        loadWriteups()
    })

    let content = $state('')

    const handleInputChange = (markdown: string) => {
        content = markdown
    }

    let quickPanelPadding = $derived(appState?.keepQuickPanelOpen ? 'lg:pl-56' : '')
</script>

<div class={`container mx-auto p-4 transition-all duration-300 ease-in-out ${quickPanelPadding}`}>
    <div>
        <Editor onInputChange={handleInputChange} />
    </div>
</div>
