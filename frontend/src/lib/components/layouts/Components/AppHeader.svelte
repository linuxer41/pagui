<script lang="ts">
    import { ArrowLeft } from '@lucide/svelte';
    import type { Snippet } from 'svelte'
    let { title = '', showBack = true, children, actions }: { title?: string; showBack?: boolean; children?: Snippet; actions?: Snippet } = $props()
    
    function goBack() {
      try { window.history.back() } catch { }
    }
</script>

<header class="app-header">
    <div class="header-content">
      {#if showBack}
        <button class="back-btn" onclick={goBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
      {/if}
      <h1 class="header-title">{title}</h1>
      <div class="header-actions">
        {#if actions}{@render actions()}{/if}
      </div>
    </div>
    <div class="sub-header">
      {#if children}{@render children()}{/if}
    </div>
  </header>

<style>

.app-header {
  padding: var(--space-4);
  background: var(--background);
  position: sticky;
  top: 0;
  z-index: 10;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  margin-right: var(--space-4);
  cursor: pointer;
  color: var(--primary);
}
.header-title {
  flex: 1;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
