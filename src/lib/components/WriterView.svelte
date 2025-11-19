<script lang="ts">
    import { appState } from '$lib/state.svelte'
    import { Editor } from '.'

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
