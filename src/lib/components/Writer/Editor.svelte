<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { Crepe } from '@milkdown/crepe'
    import { editorViewCtx } from '@milkdown/kit/core'
    import { replaceAll } from '@milkdown/kit/utils'
    import '@milkdown/crepe/theme/common/style.css'
    import '@milkdown/crepe/theme/nord.css'
    import type { EditorApi, EditorRange } from '$lib/features/voice/types'
    type CrepeWithObserver = InstanceType<typeof Crepe> & {
        __svelteObserver?: {
            disconnect?: () => void
        }
    }

    interface EditorProps {
        initialContent?: string
        onInputChange?: (markdown: string) => void
        onEditorReady?: (api: EditorApi) => void
    }

    let rootEl: HTMLDivElement | null = $state(null)
    let crepe: InstanceType<typeof Crepe> | null = $state(null)
    let value: string = $state('')
    let destroyed = false

    /** Props */
    let { onInputChange, initialContent, onEditorReady }: EditorProps = $props()

    function notifyMarkdown(markdown: string) {
        value = markdown
        if (onInputChange) onInputChange(markdown)
    }

    function getSelectionRange(): EditorRange {
        if (!crepe) return { from: 1, to: 1 }
        return crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            return {
                from: view.state.selection.from,
                to: view.state.selection.to,
            }
        })
    }

    function replaceRange(range: EditorRange, text: string): EditorRange {
        if (!crepe) return range

        return crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            const transaction = view.state.tr.insertText(text, range.from, range.to)
            view.dispatch(transaction.scrollIntoView())

            return {
                from: range.from,
                to: view.state.selection.to,
            }
        })
    }

    function focus() {
        if (!crepe) return
        crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            view.focus()
        })
    }

    function getMarkdown() {
        return crepe?.getMarkdown() ?? value
    }

    function setContent(markdown: string) {
        if (!crepe) {
            value = markdown
            return
        }
        crepe.editor.action(replaceAll(markdown))
        value = markdown
    }

    function createEditorApi(): EditorApi {
        return {
            getSelectionRange,
            replaceRange,
            focus,
            getMarkdown,
            setContent,
        }
    }

    function destroyCrepeInstance() {
        if (!crepe) return
        try {
            const observer = (crepe as CrepeWithObserver).__svelteObserver
            if (observer && typeof observer.disconnect === 'function') observer.disconnect()
        } catch {
            // Best-effort internal observer cleanup.
        }
        crepe.destroy?.()
        crepe = null
    }

    function initCrepe(defaultValue = '# ') {
        if (!rootEl) return
        destroyCrepeInstance()

        crepe = new Crepe({
            root: rootEl,
            defaultValue,
            features: {
                [Crepe.Feature.Latex]: false,
                [Crepe.Feature.ImageBlock]: false,
                [Crepe.Feature.BlockEdit]: false,
            },
            featureConfigs: {
                [Crepe.Feature.Placeholder]: { text: 'Write something cool', mode: 'block' } as const,
            },
        }).on((listener) => {
            listener.markdownUpdated((_ctx, markdown) => {
                notifyMarkdown(markdown)
            })
        })

        crepe
            .create()
            .then(() => {
                if (destroyed || !crepe) return
                onEditorReady?.(createEditorApi())
                notifyMarkdown(crepe?.getMarkdown() ?? defaultValue)
            })
            .catch((error) => {
                console.error('Failed to initialize editor', error)
            })
    }

    onMount(() => {
        if (!rootEl) return
        destroyed = false
        initCrepe(initialContent ?? '# ')
    })

    onDestroy(() => {
        destroyed = true
        destroyCrepeInstance()
    })
</script>

<!-- mount point for Crepe to render into -->
<div role="textbox" tabindex="-1" bind:this={rootEl} class="milkdown-wrapper"></div>

<style>
    .milkdown-wrapper {
        width: 100%;
        min-height: 60vh;
        min-height: 60dvh;
    }

    :global(.milkdown) {
        --crepe-color-background: var(--q-bg);
        --crepe-color-on-background: var(--q-fg);
        --crepe-color-surface: var(--q-surface);
        --crepe-color-surface-low: var(--q-surface-2);
        --crepe-color-on-surface: var(--q-fg);
        --crepe-color-on-surface-variant: var(--q-fg-muted);
        --crepe-color-outline: var(--q-fg-subtle);
        --crepe-color-primary: var(--q-accent-text);
        --crepe-color-secondary: var(--q-surface-2);
        --crepe-color-on-secondary: var(--q-fg);
        --crepe-color-inverse: var(--q-fg);
        --crepe-color-on-inverse: var(--q-bg);
        --crepe-color-inline-code: var(--q-danger);
        --crepe-color-error: var(--q-danger);
        --crepe-color-hover: var(--q-surface-2);
        --crepe-color-selected: var(--q-border-strong);
        --crepe-color-inline-area: var(--q-surface-2);
        --crepe-shadow-1: 0 1px 3px 1px rgba(15, 23, 42, 0.12), 0 1px 2px 0 rgba(15, 23, 42, 0.18);
        --crepe-shadow-2: 0 2px 6px 2px rgba(15, 23, 42, 0.12), 0 1px 2px 0 rgba(15, 23, 42, 0.18);

        background: transparent;
        width: 100%;
        max-width: 100%;
        font-family: var(--q-font);

        /* Base font size optimized for readability */
        font-size: 16px;
        line-height: 1.7;
        letter-spacing: 0.01em;
    }

    :global(.dark .milkdown) {
        --crepe-shadow-1: 0 1px 3px 1px rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.4);
        --crepe-shadow-2: 0 2px 6px 2px rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.4);
    }

    :global(.milkdown .ProseMirror) {
        padding-top: 0.5rem;
        padding-left: clamp(0.75rem, 4vw, 1.25rem);
        padding-right: clamp(0.75rem, 4vw, 1.25rem);
        padding-bottom: 3rem;
        max-width: 100%;
        overflow-wrap: break-word;
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
        .milkdown-wrapper {
            min-height: calc(100vh - 12rem);
            min-height: calc(100dvh - 12rem);
        }

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
    :global(.milkdown .ProseMirror h1) {
        font-size: clamp(1.75rem, 7vw, 2rem);
        line-height: 1.25;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        overflow-wrap: break-word;
    }

    :global(.milkdown .ProseMirror h1:first-child) {
        margin-top: 0;
    }

    :global(.milkdown .ProseMirror h2) {
        font-size: clamp(1.375rem, 5.5vw, 1.625rem);
        line-height: 1.3;
        font-weight: 600;
        letter-spacing: -0.015em;
        margin-top: 1rem;
        margin-bottom: 0.375rem;
        overflow-wrap: break-word;
    }

    :global(.milkdown .ProseMirror h3) {
        font-size: clamp(1.1875rem, 4.8vw, 1.375rem);
        line-height: 1.4;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-top: 1rem;
        margin-bottom: 0.375rem;
        overflow-wrap: break-word;
    }

    :global(.milkdown .ProseMirror h4) {
        font-size: 1.125rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }

    :global(.milkdown .ProseMirror h5) {
        font-size: 1rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }

    :global(.milkdown .ProseMirror h6) {
        font-size: 0.9375rem;
        line-height: 1.5;
        font-weight: 600;
        margin-top: 0.875rem;
        margin-bottom: 0.375rem;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror h1) {
            font-size: 2.5rem;
            margin-top: 1rem;
            margin-bottom: 0.75rem;
        }

        :global(.milkdown .ProseMirror h2) {
            font-size: 2rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }

        :global(.milkdown .ProseMirror h3) {
            font-size: 1.5rem;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
        }

        :global(.milkdown .ProseMirror h4) {
            font-size: 1.25rem;
            margin-top: 1rem;
            margin-bottom: 0.375rem;
        }
    }

    /* Paragraphs with compact spacing */
    :global(.milkdown .ProseMirror p) {
        font-size: inherit;
        line-height: 1.7;
        margin-bottom: 1rem;
        margin-top: 0;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror p) {
            line-height: 1.75;
            margin-bottom: 1.125rem;
        }
    }

    /* Reduced spacing between elements */
    :global(
        .milkdown .ProseMirror p + h2,
        .milkdown .ProseMirror p + h3,
        .milkdown .ProseMirror p + h4,
        .milkdown .ProseMirror ul + h2,
        .milkdown .ProseMirror ol + h2,
        .milkdown .ProseMirror ul + h3,
        .milkdown .ProseMirror ol + h3
    ) {
        margin-top: 1.25rem;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror p + h2, .milkdown .ProseMirror ul + h2, .milkdown .ProseMirror ol + h2) {
            margin-top: 1.5rem;
        }

        :global(.milkdown .ProseMirror p + h3, .milkdown .ProseMirror ul + h3, .milkdown .ProseMirror ol + h3) {
            margin-top: 1.25rem;
        }
    }

    /* Lists - target both standard and Milkdown structure */
    :global(.milkdown .ProseMirror ul, .milkdown .ProseMirror ol) {
        padding-left: clamp(1.25rem, 5vw, 1.75rem);
        margin-bottom: 1rem;
        margin-top: 0.25rem;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror ul, .milkdown .ProseMirror ol) {
            padding-left: 2rem;
            margin-bottom: 1.125rem;
            margin-top: 0.375rem;
        }
    }

    /* List items - zero spacing between items */
    :global(.milkdown .ProseMirror li, .milkdown .list-item) {
        margin-bottom: 0;
        line-height: 1.7;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror li, .milkdown .list-item) {
            line-height: 1.75;
        }
    }

    /* Milkdown specific list item blocks */
    :global(.milkdown .milkdown-list-item-block) {
        margin-bottom: 0;
    }

    /* Nested lists - zero spacing */
    :global(
        .milkdown .ProseMirror li > ul,
        .milkdown .ProseMirror li > ol,
        .milkdown .list-item ul,
        .milkdown .list-item ol
    ) {
        margin-top: 0;
        margin-bottom: 0;
    }

    /* List item content */
    :global(.milkdown .list-item .content-dom, .milkdown .list-item .children) {
        margin-top: 0;
        margin-bottom: 0;
    }

    :global(.milkdown .list-item p) {
        margin-bottom: 0;
        margin-top: 0;
    }

    /* Tight lists */
    :global(.milkdown .ProseMirror ul.tight li, .milkdown .ProseMirror ol.tight li) {
        margin-bottom: 0;
    }

    /* Code blocks with smaller text */
    :global(.milkdown .ProseMirror pre, .milkdown .milkdown-code-block) {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        max-width: 100%;
        padding: 0.875rem 1rem;
        border-radius: 0.5rem;
        margin-top: 0.75rem;
        margin-bottom: 1rem;
        /* Crepe highlights code with CodeMirror's oneDark tokens, which need a dark surface
           in both color modes. */
        background: #0b1220;
        color: #e2e8f0;
    }

    :global(.milkdown .milkdown-code-block .cm-editor, .milkdown .milkdown-code-block .cm-gutters) {
        background: transparent;
    }

    :global(.milkdown .ProseMirror pre code, .milkdown .cm-content) {
        font-size: 0.8125rem;
        line-height: 1.5;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror pre, .milkdown .milkdown-code-block) {
            padding: 1.25rem 1.5rem;
            margin-top: 1rem;
            margin-bottom: 1.25rem;
        }

        :global(.milkdown .ProseMirror pre code, .milkdown .cm-content) {
            font-size: 0.875rem;
            line-height: 1.6;
        }
    }

    /* Inline code */
    :global(.milkdown .ProseMirror code) {
        font-size: 0.9em;
        padding: 0.15rem 0.4rem;
        border-radius: 0.25rem;
        word-break: break-word;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-weight: 500;
    }

    :global(.milkdown .ProseMirror pre code) {
        padding: 0;
        font-size: inherit;
        font-weight: 400;
    }

    /* Blockquotes */
    :global(.milkdown .ProseMirror blockquote) {
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
        :global(.milkdown .ProseMirror blockquote) {
            padding-left: 1.75rem;
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            margin-left: 0.5rem;
            margin-top: 1rem;
            margin-bottom: 1.25rem;
            line-height: 1.75;
        }
    }

    :global(.milkdown .ProseMirror blockquote p) {
        margin-bottom: 0.5rem;
    }

    :global(.milkdown .ProseMirror blockquote p:last-child) {
        margin-bottom: 0;
    }

    /* Tables */
    :global(.milkdown .ProseMirror table, .milkdown .milkdown-table-block table) {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
        max-width: 100%;
        margin-top: 1rem;
        margin-bottom: 1rem;
        border-collapse: collapse;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror table, .milkdown .milkdown-table-block table) {
            display: table;
            margin-top: 1.25rem;
            margin-bottom: 1.25rem;
        }
    }

    :global(.milkdown .ProseMirror th, .milkdown .ProseMirror td) {
        padding: 0.625rem 0.875rem;
        text-align: left;
        line-height: 1.6;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror th, .milkdown .ProseMirror td) {
            padding: 0.75rem 1rem;
            line-height: 1.65;
        }
    }

    /* Horizontal rules */
    :global(.milkdown .ProseMirror hr) {
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
        height: 1px;
        border: none;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror hr) {
            margin-top: 2rem;
            margin-bottom: 2rem;
        }
    }

    /* Links with proper wrapping */
    :global(.milkdown .ProseMirror a) {
        padding: 0.125rem 0.125rem;
        margin: -0.125rem -0.125rem;
        display: inline-block;
        max-width: 100%;
        min-height: 44px;
        line-height: 1.6;
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
        word-break: break-word;
        overflow-wrap: anywhere;
        hyphens: auto;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror a) {
            min-height: auto;
            line-height: inherit;
            padding: 0.0625rem 0.125rem;
            margin: -0.0625rem -0.125rem;
        }
    }

    /* Strong and emphasis */
    :global(.milkdown .ProseMirror strong) {
        font-weight: 600;
        letter-spacing: -0.005em;
    }

    :global(.milkdown .ProseMirror em) {
        font-style: italic;
    }

    /* Markdown images stay inside the text column */
    :global(.milkdown .ProseMirror img) {
        max-width: 100%;
        height: auto;
    }

    /* Task lists */
    :global(.milkdown .ProseMirror ul[data-type='taskList']) {
        list-style: none;
        padding-left: 0.25rem;
    }

    :global(.milkdown .ProseMirror ul[data-type='taskList'] li) {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
    }

    @media (min-width: 768px) {
        :global(.milkdown .ProseMirror ul[data-type='taskList'] li) {
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

    /* Selection with the theme accent */
    :global(.milkdown ::selection) {
        background-color: var(--q-selection);
        color: inherit;
    }

    :global(.milkdown ::-moz-selection) {
        background-color: var(--q-selection);
        color: inherit;
    }
</style>
