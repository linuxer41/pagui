<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { X } from '@lucide/svelte';
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let width = '90%';
  export let maxWidth = '500px';

  const dispatch = createEventDispatcher();

  function closeModal() {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleEscape} />

{#if open}
  <div class="modal-backdrop" on:click={handleBackdropClick} in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}>
    <div 
      class="modal-content"
      style="width: {width}; max-width: {maxWidth};"
      in:fly={{ y: 20, duration: 250, opacity: 0 }}
      out:fly={{ y: 20, duration: 200, opacity: 0 }}
    >
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="close-btn" on:click={closeModal} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    box-sizing: border-box;
    backdrop-filter: blur(2px);
  }

  .modal-content {
    background-color: var(--surface);
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    border: 1px solid var(--border-color);
  }

  .modal-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  /* Solo mostrar el footer si hay contenido */
  .modal-footer:empty {
    display: none;
  }
</style> 