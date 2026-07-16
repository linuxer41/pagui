<script lang="ts">
  import { X } from '@lucide/svelte'
  import { tick } from 'svelte'
  import type { Snippet } from 'svelte'
  let { open = $bindable(false), title = '', onclose = undefined as (() => void) | undefined, children }: { open?: boolean; title?: string; onclose?: () => void; children?: Snippet } = $props()
  let sheetEl = $state<HTMLDivElement>()

  function close() {
    open = false
    onclose?.()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  $effect(() => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      tick().then(() => {
        const btn = sheetEl?.querySelector<HTMLButtonElement>('.sheet-close')
        btn?.focus()
      })
      return () => window.removeEventListener('keydown', onKeydown)
    }
  })
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={close}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label={title || 'Diálogo'} tabindex="-1" bind:this={sheetEl} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <div class="sheet-header">
        <span class="sheet-title">{title}</span>
        <button class="sheet-close" onclick={close} aria-label="Cerrar"><X size={20} /></button>
      </div>
      <div class="sheet-body">
        {#if children}{@render children()}{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s;
  }
  .sheet {
    width: 100%; max-width: 480px;
    background: var(--background);
    border-radius: var(--radius-m) var(--radius-m) 0 0;
    padding: var(--space-4);
    animation: slideUp 0.25s ease-out;
    max-height: 80vh; overflow-y: auto;
  }
  .sheet-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: var(--space-4);
  }
  .sheet-title { font-size: var(--text-lg); font-weight: 700; color: var(--foreground); }
  .sheet-close {
    width: 36px; height: 36px; border-radius: var(--radius-full);
    border: none; background: rgba(var(--surface-rgb), 1);
    color: var(--muted-foreground);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity var(--duration-fast);
  }
  .sheet-close:active { opacity: 0.7; }
  .sheet-close:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .sheet-body { display: flex; flex-direction: column; gap: var(--space-3); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
