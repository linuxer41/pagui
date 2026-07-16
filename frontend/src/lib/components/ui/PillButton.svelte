<script lang="ts">
  let { label = '', onClick = undefined as any, loading = false, disabled = false, fullWidth = false, type = 'button' as const } = $props()
</script>

<button {type} class="pill" class:full={fullWidth} {disabled} onclick={onClick}>
  {#if loading}
    <span class="spinner"></span>
    <span>Procesando…</span>
  {:else}
    {label}
  {/if}
</button>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 10px 16px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--primary);
    color: var(--primary-foreground);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--duration-fast);
    white-space: nowrap;
  }
  .pill:active { opacity: 0.8; }
  .pill:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .pill:disabled { opacity: 0.35; cursor: not-allowed; }
  .pill.full { width: 100%; }
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
</style>
