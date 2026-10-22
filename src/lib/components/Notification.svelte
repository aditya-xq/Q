<script lang="ts">
    import { fly } from 'svelte/transition'
    import { notifications } from '$lib/state.svelte'
    import { getNotificationColor, removeNotification } from '$lib/utils/notification'
</script>

<div
    class="fixed top-4 left-4 right-4 z-2000 space-y-2 md:left-auto md:right-20 md:max-w-md"
    role="status"
    aria-live="polite"
>
    {#each notifications as notification (notification.id)}
        <div
            transition:fly={{ x: 50, duration: 300 }}
            class="p-3 rounded-xl shadow-md border-l-4 {getNotificationColor(
                notification.type
            )} flex items-center justify-between text-sm"
        >
            <div class="mr-3">{notification.message}</div>
            <button
                onclick={() => removeNotification(notification.id)}
                class="ml-1 rounded-md p-1 text-fg-muted transition-colors hover:text-fg"
                aria-label="Close notification"
            >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-width="2" d="M6 6l12 12M18 6L6 18" />
                </svg>
            </button>
        </div>
    {/each}
</div>
