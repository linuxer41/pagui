<script lang="ts">
import '../lib/theme.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

{@render children?.()}
