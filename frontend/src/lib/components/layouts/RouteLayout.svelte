<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte'

  let { title = '', right = undefined, children } = $props()
</script>

<div class="route-layout safe-top">
  <header class="route-header">
    <button class="back-btn" onclick={() => history.back()}>
      <ArrowLeft size={20} />
    </button>
    <h1 class="route-title">{title}</h1>
    <div class="route-actions">
      {#if right}
        {@render right()}
      {/if}
    </div>
  </header>
  <main class="route-content">
    {@render children()}
  </main>
</div>

<style>
  .route-layout {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--bg-primary);
  }
  .route-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border);
  }
  .back-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--surface);
    border-radius: var(--radius-full);
    color: var(--text-primary);
    box-shadow: var(--shadow-xs);
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }
  .back-btn:active { transform: scale(0.92); }
  .route-title {
    flex: 1;
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: var(--tracking-tight);
  }
  .route-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .route-content {
    flex: 1;
    padding: var(--space-4);
    padding-bottom: calc(var(--space-8) + var(--nav-bottom));
  }
</style>
