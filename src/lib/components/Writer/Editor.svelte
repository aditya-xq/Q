<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { Crepe } from '@milkdown/crepe'
    import '@milkdown/crepe/theme/common/style.css'
    import '@milkdown/crepe/theme/nord-dark.css'

    let rootEl: HTMLDivElement | null = $state(null)
    let crepe: InstanceType<typeof Crepe> | null = $state(null)
    let value: string = $state('')

    /** Props */
    let { onInputChange } = $props();

    const handleMarkdown = () => {
        if (crepe) {
            value = crepe.getMarkdown()
            if (onInputChange) onInputChange(value)
        }
    }

    onMount(() => {
        if (!rootEl) return

        crepe = new Crepe({
            root: rootEl,
            defaultValue: '# ',
            features: {
                [Crepe.Feature.Latex]: false,
                [Crepe.Feature.ImageBlock]: false,
                [Crepe.Feature.BlockEdit]: false,
            },
            featureConfigs: {
                [Crepe.Feature.Placeholder]: { text: 'Write something cool', mode: 'block' } as any
            }
        })
        crepe.create()
    })

    onDestroy(() => {
        // disconnect observer and destroy crepe
        if (crepe) {
            try {
                const obs = (crepe as any).__svelteObserver
                if (obs && typeof obs.disconnect === 'function') obs.disconnect()
            } catch (_) {}
            crepe.destroy?.()
            crepe = null
        }
    })
</script>

<!-- mount point for Crepe to render into -->
<div role="textbox" tabindex="-1" bind:this={rootEl} onkeyup={handleMarkdown}></div>

<style>
    :global(.milkdown) {
        /* override any of milkdown/crepe css variables here */
        --crepe-color-background: #0f1724;
        --crepe-color-on-background: #f8fafc;
        --crepe-color-surface: #071028;
        --crepe-color-on-surface: #e6eef8;
        --crepe-color-primary: #60a5fa;
    }

    :global(.dark .milkdown) {
        --crepe-color-background: #0b1220;
        --crepe-color-on-background: #f1f5f9;
    }

    :global(.milkdown) {
        background: transparent;
    }
</style>
