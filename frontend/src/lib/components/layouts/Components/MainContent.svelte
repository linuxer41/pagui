<script lang="ts">
  import type { Snippet } from 'svelte'
  let { children }: { children?: Snippet } = $props()
</script>

<main class="main-content">
  {#if children}{@render children()}{/if}
</main>

<style>
  .main-content {
    position: relative;
    z-index: 1;
    min-height: 100%;
    margin: auto;
    max-width: 480px;
    width: 100%;
  }
</style>
