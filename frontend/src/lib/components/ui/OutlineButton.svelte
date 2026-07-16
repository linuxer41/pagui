<script lang="ts">
  let { children, onClick = undefined as any, disabled = false, fullWidth = false } = $props()
</script>

<button class="outline" class:full={fullWidth} {disabled} onclick={onClick}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--foreground);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-fast);
    white-space: nowrap;
  }
  .outline:active { border-color: var(--primary); color: var(--primary); }
  .outline:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .outline:disabled { opacity: 0.35; cursor: not-allowed; }
  .outline.full { width: 100%; }
</style>
