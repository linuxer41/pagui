<script lang="ts">
  let { icon: Icon = undefined as any, onClick = undefined as any, ariaLabel = '', size = 36 as number } = $props()
</script>

<button class="icon-btn" style="width: {size}px; height: {size}px;" onclick={onClick} aria-label={ariaLabel}>
  {#if Icon}
    <Icon size={size > 40 ? 22 : 18} />
  {/if}
</button>

<style>
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--radius-m);
    background: rgba(var(--surface-rgb), 1);
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all var(--duration-fast);
    flex-shrink: 0;
  }
  .icon-btn:active { background: rgba(var(--surface-alt-rgb), 1); color: var(--foreground); }
  .icon-btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
