<script lang="ts">
    import { appState } from "$lib/state.svelte"
    import { deriveTitle } from "$lib/utils/utils"
    import { DeleteButton } from "../shared"
    let { createNewDraft, currentWriteupId, openDraft, removeDraft } = $props()
</script>

<aside class="w-80 pl-4">
    <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium p-2">Drafts</h3>
        <button class="bg-sky-600 font-bold text-xs m-2 px-2 py-1 rounded-md" onclick={createNewDraft}>New</button>
    </div>
    <div class="space-y-2">
        {#each appState.writeups as w (w.id)}
            <div class={`p-2 rounded hover:bg-slate-800 cursor-pointer ${w.id === currentWriteupId ? 'bg-slate-800' : ''}`}>
                <div class="flex items-center justify-between">
                    <button class="flex-1 text-left" onclick={() => openDraft(w.id)}>
                        <div class="font-medium truncate">{deriveTitle(w.content)}</div>
                        <div class="text-xs text-stone-400 truncate">{new Date(w.updatedAt).toLocaleString()}</div>
                    </button>
                    <div class="ml-2 flex items-center gap-2">
                        <DeleteButton handleDelete={() => removeDraft(w.id)} />
                    </div>
                </div>
            </div>
        {/each}
    </div>
</aside>
