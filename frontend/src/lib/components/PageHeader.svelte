<script lang="ts">
  let { title = '', back = true, onback = undefined as (() => void) | undefined } = $props()
</script>

<div class="page-header">
  {#if back}
    <button class="back-btn" aria-label="Volver" onclick={onback ?? (() => history.back())}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  {/if}
  <h1 class="header-title">{title}</h1>
</div>

<style>
  .page-header {
    display: flex; align-items: center; gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .back-btn {
    width: 36px; height: 36px; border-radius: var(--radius-full);
    border: none; background: rgba(var(--surface-rgb), 1);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--foreground);
    flex-shrink: 0; transition: background var(--duration-fast);
  }
  .back-btn:active { background: rgba(var(--surface-alt-rgb), 1); }
  .back-btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .header-title {
    font-size: var(--text-lg); font-weight: 700;
    color: var(--foreground); margin: 0;
  }
</style>
