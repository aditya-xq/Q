<script lang="ts">
    interface Props {
        emoji: string
        title: string
        desc: string
        colorClass: string
    }

    let { emoji, title, desc, colorClass }: Props = $props()
</script>

<div class="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex items-center gap-3 shadow-sm hover:bg-slate-800/50 transition-colors">
    <span class="text-3xl select-none" role="img" aria-label={title}>{emoji}</span>
    <div>
        <div class={`text-xl font-bold ${colorClass}`}>{title}</div>
        <div class="text-[16px] text-slate-500 leading-tight">{desc}</div>
    </div>
</div>
