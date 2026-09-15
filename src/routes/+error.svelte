<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
</script>

<div
    class="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-700 dark:bg-slate-950 dark:text-slate-200"
>
    <h1 class="text-5xl font-black tracking-tight">{page.status}</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">
        {page.error?.message ?? 'Something went wrong.'}
    </p>
    <a
        href={resolve('/')}
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:border-sky-400 hover:text-sky-500 dark:border-slate-700"
    >
        Back to Q
    </a>
</div>
