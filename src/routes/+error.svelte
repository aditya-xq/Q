<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
    <h1 class="text-5xl font-black tracking-tight">{page.status}</h1>
    <p class="text-sm text-fg-muted">
        {page.error?.message ?? 'Something went wrong.'}
    </p>
    <a
        href={resolve('/')}
        class="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
    >
        Back to Q
    </a>
</div>
