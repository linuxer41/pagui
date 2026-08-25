<script lang="ts">
  import type { Snippet } from 'svelte'
  let { children }: { children?: Snippet } = $props()
</script>

<div class="auth-shell">
  {#if children}{@render children()}{/if}
</div>

<style>
  .auth-shell {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--titlebar-height));
    overflow-y: auto;
    overscroll-behavior: contain;
    max-width: 480px;
    margin: 0 auto;
    background: rgba(var(--bg-rgb), 1);
    /* padding-top: var(--safe-top, 0px); */
    padding-bottom: var(--safe-bottom, 0px);
  }
</style>
