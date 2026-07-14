<script lang="ts">
  import { X } from '@lucide/svelte'

  let { open = false, title = '', maxWidth = '400px', showClose = true, onclose, children } = $props()

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose?.()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose?.()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop animate-fade-in" onclick={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal-content animate-scale-in" style="max-width: {maxWidth}">
      {#if title || showClose}
        <div class="modal-header">
          <h3 class="modal-title">{title}</h3>
          {#if showClose}
            <button class="modal-close" onclick={() => onclose?.()} aria-label="Cerrar">
              <X size={18} />
            </button>
          {/if}
        </div>
      {/if}
      <div class="modal-body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
  }
  .modal-content {
    background: var(--surface);
    border-radius: var(--radius-2xl);
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border);
    animation: scaleIn 250ms var(--ease-spring);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-5) 0;
  }
  .modal-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
  }
  .modal-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--surface-hover);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    transition: all var(--duration-fast) var(--ease-out);
    flex-shrink: 0;
  }
  .modal-close:hover { background: var(--border); color: var(--text-primary); }
  .modal-body { padding: var(--space-5); }
</style>
