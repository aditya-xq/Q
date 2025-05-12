<script lang="ts">
	import '../app.css'
	let { children } = $props()
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickTodo</title>
    <meta charset="UTF-8">
</svelte:head>

{@render children()}
