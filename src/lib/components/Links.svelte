<script lang="ts">
    import { appState } from '../state.svelte'

    function openGmail() {
        window.open('https://mail.google.com', '_blank')
    }
    
    function openWhatsAppWeb() {
        window.open('https://web.whatsapp.com', '_blank')
    }

    function toggleProjectView() {
        appState.projectView = !appState.projectView
    }
</script>
  
<div class="flex items-center text-lg">
    <!-- Gmail icon -->
    <button 
        class="flex items-center justify-center px-3 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        onclick={openGmail}
        title="Gmail"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
        </svg>
        <span>Gmail</span>
    </button>
    
    <!-- WhatsApp Web icon -->
    <button 
        class="flex items-center justify-center px-3 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        onclick={openWhatsAppWeb}
        title="WhatsApp Web"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-.47.36-2.96-.73-2.49-1.09-3.99-3.75-4.11-3.92-.12-.17-.96-1.38-.92-2.61.05-1.22.69-1.8.95-2.04.24-.26.51-.29.68-.26h.47c.15 0 .36-.06.55.45l.69 1.87c.06.13.1.28.01.44l-.27.41-.39.42c-.12.12-.26.25-.12.5.12.26.62 1.09 1.32 1.78.91.88 1.71 1.17 1.95 1.3.24.14.39.12.54-.04l.81-.94c.19-.25.35-.19.58-.11l1.67.88M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10c-1.97 0-3.8-.57-5.35-1.55L2 22l1.55-4.65A9.969 9.969 0 0 1 2 12 10 10 0 0 1 12 2m0 2a8 8 0 0 0-8 8c0 1.72.54 3.31 1.46 4.61L4.5 19.5l2.89-.96A7.95 7.95 0 0 0 12 20a8 8 0 0 0 8-8 8 8 0 0 0-8-8z"/>
        </svg>
        <span>WhatsApp</span>
    </button>
    
    <!-- Projects button (toggle) -->
    <button 
        class="flex items-center justify-center px-3 py-2 rounded-full transition-colors {appState.projectView ? 'bg-slate-300 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}"
        onclick={toggleProjectView}
        title="Projects"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
        </svg>
        <span>Projects</span>
    </button>
</div>
