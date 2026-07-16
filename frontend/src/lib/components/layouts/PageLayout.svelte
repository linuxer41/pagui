<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte'
  import type { Snippet } from 'svelte'

  let {
    title = '',
    children,
    actions
  }: { title: string; children: Snippet; actions?: Snippet } = $props()
</script>

<div class="page-layout">
  <div class="pl-header">
    <button class="pl-back" aria-label="Volver" onclick={() => history.back()}>
      <ArrowLeft size={20} />
    </button>
    <h1 class="pl-title">{title}</h1>
    {#if actions}
      <div class="pl-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
  <div class="pl-body">
    {@render children()}
  </div>
</div>

<style>
  .page-layout {
    display: flex; flex-direction: column;
    min-height: 100dvh;
  }
  .pl-header {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-4) var(--space-4) 0;
  }
  .pl-back {
    width: 36px; height: 36px; border-radius: var(--radius-full);
    border: none; background: rgba(var(--surface-rgb), 1);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--foreground);
    flex-shrink: 0; transition: background var(--duration-fast);
  }
  .pl-back:active { background: rgba(var(--surface-alt-rgb), 1); }
  .pl-back:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .pl-title {
    font-size: var(--text-lg); font-weight: 700;
    color: var(--foreground); margin: 0; flex: 1;
  }
  .pl-actions {
    display: flex; align-items: center; gap: var(--space-2);
    margin-left: auto;
  }
  .pl-body {
    flex: 1;
    padding: var(--space-4);
  }
</style>
