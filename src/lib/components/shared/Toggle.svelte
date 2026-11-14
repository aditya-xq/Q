<script lang="ts">
    let {
        label,
        checked,
        disabled = false,
        onchange,
    }: {
        label: string
        checked: boolean
        disabled?: boolean
        onchange: () => void
    } = $props()
</script>

<div class="flex items-center gap-2 sm:gap-3">
    <p class="text-xs text-fg-muted sm:text-sm">{label}</p>
    <button
        type="button"
        onclick={onchange}
        aria-pressed={checked}
        aria-label={`Toggle ${label.toLowerCase()} widget`}
        {disabled}
        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:h-6 sm:w-11
            {checked ? 'bg-accent' : 'bg-surface-2'}"
    >
        <span
            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 sm:h-5 sm:w-5
            {checked ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}"
        ></span>
    </button>
</div>
