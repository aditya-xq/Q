<script lang="ts">
    let { label, onclick, testId }: { label: string; onclick: () => void; testId?: string } = $props()
</script>

<button
    type="button"
    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg active:scale-95"
    aria-label={label}
    data-testid={testId}
    {onclick}
>
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-width="2" d="M6 6l12 12M18 6L6 18" />
    </svg>
</button>
