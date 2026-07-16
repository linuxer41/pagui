<script lang="ts">
  let { label = '', labelSnippet, children }: { label?: string; labelSnippet?: import('svelte').Snippet; children?: import('svelte').Snippet } = $props()
</script>

<div class="section">
  {#if label || labelSnippet}
    <span class="section-label">
      {#if labelSnippet}{@render labelSnippet()}{:else}{label}{/if}
    </span>
  {/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .section { display: flex; flex-direction: column; gap: var(--space-3); }
  .section-label {
    font-size: var(--text-xs); font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--muted-foreground);
  }
</style>
