<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { Crepe } from '@milkdown/crepe'
    import '@milkdown/crepe/theme/common/style.css'
    import '@milkdown/crepe/theme/nord-dark.css'

    let rootEl: HTMLDivElement | null = $state(null)
    let crepe: InstanceType<typeof Crepe> | null = $state(null)
    let value: string = $state('')

    /** Props */
    let { onInputChange, initialContent } = $props()

    const handleMarkdown = () => {
        if (crepe) {
            value = crepe.getMarkdown()
            if (onInputChange) onInputChange(value)
        }
    }

    function initCrepe(defaultValue = '# ') {
        if (!rootEl) return
        // destroy previous if exists
        if (crepe) {
            try {
                const obs = (crepe as any).__svelteObserver
                if (obs && typeof obs.disconnect === 'function') obs.disconnect()
            } catch (_) {}
            crepe.destroy?.()
            crepe = null
        }

        crepe = new Crepe({
            root: rootEl,
            defaultValue,
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
    }

    onMount(() => {
        if (!rootEl) return
        initCrepe(initialContent || '# ')
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
<div 
    role="textbox" 
    tabindex="-1" 
    bind:this={rootEl} 
    onkeyup={handleMarkdown}
    class="milkdown-wrapper"
></div>

<style>
    .milkdown-wrapper {
        width: 100%;
        min-height: 60vh;
    }

    :global(.milkdown) {
        --crepe-color-background: #0f1724;
        --crepe-color-on-background: #f8fafc;
        --crepe-color-surface: #071028;
        --crepe-color-on-surface: #e6eef8;
        --crepe-color-primary: #60a5fa;
        
        /* Base font size optimized for readability */
        font-size: 16px;
        line-height: 1.7;
        letter-spacing: 0.01em;
    }

    :global(.dark .milkdown) {
        --crepe-color-background: #0b1220;
        --crepe-color-on-background: #f1f5f9;
    }

    :global(.milkdown) {
        background: transparent;
        width: 100%;
        max-width: 100%;
    }
    
    :global(.milkdown .ProseMirror) {
        padding-top: 0.5rem;
        padding-left: 1.25rem;
        padding-right: 1.25rem;
        padding-bottom: 3rem;
        max-width: 100%;
    }
    
    /* Tablet and up */
    @media (min-width: 640px) {
        :global(.milkdown .ProseMirror) {
            padding-left: 2rem;
            padding-right: 2rem;
        }
    }
    
    /* Desktop */
    @media (min-width: 768px) {
        :global(.milkdown) {
            font-size: 17px;
            line-height: 1.75;
        }
        
        :global(.milkdown .ProseMirror) {
            padding-left: 3rem;
            padding-right: 3rem;
            max-width: 46rem;
            margin-left: auto;
            margin-right: auto;
        }
    }
    
    @media (min-width: 1024px) {
        :global(.milkdown) {
            font-size: 18px;
        }
        
        :global(.milkdown .ProseMirror) {
            max-width: 50rem;
        }
    }
    
    /* Headings with reduced spacing */
    :global(.milkdown h1) {
        font-size: 2rem;
        line-height: 1.25;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }
    
    :global(.milkdown h1:first-child) {
        margin-top: 0;
    }
    
    :global(.milkdown h2) {
        font-size: 1.625rem;
        line-height: 1.3;
        font-weight: 600;
        letter-spacing: -0.015em;
        margin-top: 1rem;
        margin-bottom: 0.375rem;
    }
    
    :global(.milkdown h3) {
        font-size: 1.375rem;
        line-height: 1.4;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-top: 1rem;
        margin-bottom: 0.375rem;
    }
    
    :global(.milkdown h4) {
        font-size: 1.125rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }
    
    :global(.milkdown h5) {
        font-size: 1rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }
    
    :global(.milkdown h6) {
        font-size: 0.9375rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown h1) {
            font-size: 2.5rem;
            margin-top: 1rem;
            margin-bottom: 0.75rem;
        }
        
        :global(.milkdown h2) {
            font-size: 2rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }
        
        :global(.milkdown h3) {
            font-size: 1.5rem;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
        }
        
        :global(.milkdown h4) {
            font-size: 1.25rem;
            margin-top: 1rem;
            margin-bottom: 0.375rem;
        }
    }
    
    /* Paragraphs with compact spacing */
    :global(.milkdown p) {
        line-height: 1.7;
        margin-bottom: 1rem;
        margin-top: 0;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown p) {
            line-height: 1.75;
            margin-bottom: 1.125rem;
        }
    }
    
    /* Reduced spacing between elements */
    :global(.milkdown p + h2,
            .milkdown p + h3,
            .milkdown p + h4,
            .milkdown ul + h2,
            .milkdown ol + h2,
            .milkdown ul + h3,
            .milkdown ol + h3) {
        margin-top: 1.25rem;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown p + h2,
                .milkdown ul + h2,
                .milkdown ol + h2) {
            margin-top: 1.5rem;
        }
        
        :global(.milkdown p + h3,
                .milkdown ul + h3,
                .milkdown ol + h3) {
            margin-top: 1.25rem;
        }
    }
    
    /* Lists - target both standard and Milkdown structure */
    :global(.milkdown ul,
            .milkdown ol) {
        padding-left: 1.75rem;
        margin-bottom: 1rem;
        margin-top: 0.25rem;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown ul,
                .milkdown ol) {
            padding-left: 2rem;
            margin-bottom: 1.125rem;
            margin-top: 0.375rem;
        }
    }
    
    /* List items - zero spacing between items */
    :global(.milkdown li,
            .milkdown .list-item) {
        margin-bottom: 0;
        line-height: 1.7;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown li,
                .milkdown .list-item) {
            line-height: 1.75;
        }
    }
    
    /* Milkdown specific list item blocks */
    :global(.milkdown .milkdown-list-item-block) {
        margin-bottom: 0;
    }
    
    /* Nested lists - zero spacing */
    :global(.milkdown li > ul,
            .milkdown li > ol,
            .milkdown .list-item ul,
            .milkdown .list-item ol) {
        margin-top: 0;
        margin-bottom: 0;
    }
    
    /* List item content */
    :global(.milkdown .list-item .content-dom,
            .milkdown .list-item .children) {
        margin-top: 0;
        margin-bottom: 0;
    }
    
    :global(.milkdown .list-item p) {
        margin-bottom: 0;
        margin-top: 0;
    }
    
    /* Tight lists */
    :global(.milkdown ul.tight li,
            .milkdown ol.tight li) {
        margin-bottom: 0;
    }
    
    /* Code blocks with smaller text */
    :global(.milkdown pre,
            .milkdown .milkdown-code-block) {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 1rem 1.25rem;
        border-radius: 0.5rem;
        margin-top: 0.75rem;
        margin-bottom: 1rem;
    }
    
    :global(.milkdown pre code,
            .milkdown .cm-content) {
        font-size: 0.8125rem;
        line-height: 1.5;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown pre,
                .milkdown .milkdown-code-block) {
            padding: 1.25rem 1.5rem;
            margin-top: 1rem;
            margin-bottom: 1.25rem;
        }
        
        :global(.milkdown pre code,
                .milkdown .cm-content) {
            font-size: 0.875rem;
            line-height: 1.6;
        }
    }
    
    /* Inline code */
    :global(.milkdown code) {
        font-size: 0.9em;
        padding: 0.15rem 0.4rem;
        border-radius: 0.25rem;
        word-break: break-word;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-weight: 500;
    }
    
    :global(.milkdown pre code) {
        padding: 0;
        font-size: inherit;
        font-weight: 400;
    }
    
    /* Blockquotes */
    :global(.milkdown blockquote) {
        padding-left: 1.25rem;
        padding-top: 0.375rem;
        padding-bottom: 0.375rem;
        margin-left: 0;
        margin-top: 0.75rem;
        margin-bottom: 1rem;
        font-style: italic;
        line-height: 1.7;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown blockquote) {
            padding-left: 1.75rem;
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            margin-left: 0.5rem;
            margin-top: 1rem;
            margin-bottom: 1.25rem;
            line-height: 1.75;
        }
    }
    
    :global(.milkdown blockquote p) {
        margin-bottom: 0.5rem;
    }
    
    :global(.milkdown blockquote p:last-child) {
        margin-bottom: 0;
    }
    
    /* Tables */
    :global(.milkdown table,
            .milkdown .milkdown-table-block table) {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
        margin-top: 1rem;
        margin-bottom: 1rem;
        border-collapse: collapse;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown table,
                .milkdown .milkdown-table-block table) {
            display: table;
            margin-top: 1.25rem;
            margin-bottom: 1.25rem;
        }
    }
    
    :global(.milkdown th,
            .milkdown td) {
        padding: 0.625rem 0.875rem;
        text-align: left;
        line-height: 1.6;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown th,
                .milkdown td) {
            padding: 0.75rem 1rem;
            line-height: 1.65;
        }
    }
    
    /* Horizontal rules */
    :global(.milkdown hr) {
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
        height: 1px;
        border: none;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown hr) {
            margin-top: 2rem;
            margin-bottom: 2rem;
        }
    }
    
    /* Links with proper wrapping */
    :global(.milkdown a) {
        padding: 0.125rem 0.125rem;
        margin: -0.125rem -0.125rem;
        display: inline-block;
        min-height: 44px;
        line-height: 1.6;
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
        word-break: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown a) {
            min-height: auto;
            line-height: inherit;
            padding: 0.0625rem 0.125rem;
            margin: -0.0625rem -0.125rem;
        }
    }
    
    /* Strong and emphasis */
    :global(.milkdown strong) {
        font-weight: 600;
        letter-spacing: -0.005em;
    }
    
    :global(.milkdown em) {
        font-style: italic;
    }
    
    /* Task lists */
    :global(.milkdown ul[data-type="taskList"]) {
        list-style: none;
        padding-left: 0.25rem;
    }
    
    :global(.milkdown ul[data-type="taskList"] li) {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
    }
    
    @media (min-width: 768px) {
        :global(.milkdown ul[data-type="taskList"] li) {
            gap: 0.75rem;
        }
    }
    
    /* Toolbar accessibility on mobile */
    :global(.milkdown .crepe-menu) {
        position: sticky;
        top: 0;
        z-index: 10;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    
    /* Focus states */
    :global(.milkdown .ProseMirror:focus) {
        outline: none;
    }
    
    /* Selection with slate color */
    :global(.milkdown ::selection) {
        background-color: rgba(100, 116, 139, 0.4);
        color: inherit;
    }
    
    :global(.milkdown ::-moz-selection) {
        background-color: rgba(100, 116, 139, 0.4);
        color: inherit;
    }
</style>
