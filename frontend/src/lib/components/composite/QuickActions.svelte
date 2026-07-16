<script lang="ts">
  import { Send, QrCode, Camera, Banknote } from '@lucide/svelte'
  type ClickHandler = (e: MouseEvent) => void
  let { onSend = (() => {}) as ClickHandler, onReceive = (() => {}) as ClickHandler, onScan = (() => {}) as ClickHandler, onCash = (() => {}) as ClickHandler } = $props()
  const actions: { label: string; icon: any; onclick: ClickHandler }[] = [
    { label: 'Enviar', icon: Send, onclick: onSend },
    { label: 'Cobrar', icon: QrCode, onclick: onReceive },
    { label: 'Escanear', icon: Camera, onclick: onScan },
    { label: 'Efectivo', icon: Banknote, onclick: onCash },
  ]
</script>

<div class="quick-actions">
  {#each actions as { label, icon: Icon, onclick }}
    <button class="qa-item" {onclick}>
      <div class="qa-icon">
        <Icon size={20} />
      </div>
      <span class="qa-label">{label}</span>
    </button>
  {/each}
</div>

<style>
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-1);
  }
  .qa-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border: none;
    border-radius: var(--radius-lg);
    background: transparent;
    color: rgba(var(--text-secondary-rgb), 1);
    cursor: pointer;
    transition: all var(--duration-fast);
  }
  .qa-item:active { background: rgba(var(--surface-rgb), 1); }
  .qa-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: rgba(var(--surface-rgb), 1);
    color: var(--primary);
  }
  .qa-label {
    font-size: var(--text-xs);
    font-weight: 600;
  }
</style>
