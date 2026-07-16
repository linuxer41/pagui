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
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    background: rgba(var(--bg-rgb), 1);
  }
</style>
