<script lang="ts">
    import { fly } from 'svelte/transition'
    import { notifications } from '$lib/state.svelte'
    import { getNotificationColor, removeNotification } from '$lib/utils/notification'
</script>

<div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
    {#each notifications as notification (notification.id)}
        <div 
            transition:fly={{ x: 50, duration: 300 }}
            class="p-3 rounded-lg shadow-md border-l-4 {getNotificationColor(notification.type)} flex justify-between items-center"
        >
            <div class="mr-3">{notification.message}</div>
            <button 
                onclick={() => removeNotification(notification.id)}
                class="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    {/each}
</div>
