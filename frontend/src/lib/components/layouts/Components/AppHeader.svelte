<script lang="ts">
    import { ArrowLeft } from '@lucide/svelte';
    export let title: string;
    export let showBack: boolean = true;
</script>

<header class="app-header">
    <div class="header-content">
      {#if showBack}
        <button class="back-btn" on:click={() => window.history.back()} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
      {/if}
      <h1 class="header-title">{title}</h1>
      <div class="header-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="sub-header">
      <slot name="sub-header" />
    </div>
  </header>

<style>

.app-header {
  padding: var(--spacing-md);
  background: var(--surface);
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
  margin-right: var(--spacing-md);
  cursor: pointer;
  color: var(--primary-color);
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
  gap: var(--spacing-sm);
}
</style>