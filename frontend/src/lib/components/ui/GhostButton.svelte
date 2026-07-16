<script lang="ts">
  let { children, onClick = undefined as any, disabled = false } = $props()
</script>

<button class="ghost" {disabled} onclick={onClick}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    height: 40px;
    padding: 10px 16px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--muted-foreground);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast);
  }
  .ghost:active { background: rgba(var(--surface-rgb), 1); color: var(--foreground); }
  .ghost:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .ghost:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
