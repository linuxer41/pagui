<script lang="ts">
  import { toasts } from '../stores/toast';
  import { CheckCircle, XCircle, Info, AlertTriangle, X } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';

  const icons: Record<string, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  };
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast {toast.type}"
      in:fly={{ x: 32, duration: 200 }}
      out:fade={{ duration: 200 }}
    >
      {#each [icons[toast.type || 'info']] as ToastIcon}
      <span class="toast-icon"><ToastIcon size={18} /></span>
      {/each}
      <span class="toast-message">{toast.message}</span>
      <button class="toast-close" onclick={() => toasts.remove(toast.id)} aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    background: var(--popover);
    color: var(--foreground);
    border-radius: var(--radius-m);
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    padding: 0.75rem 1.25rem;
    min-width: 220px;
    max-width: 320px;
    font-size: var(--text-sm);
    pointer-events: auto;
    border-left: 4px solid var(--ring);
    gap: 0.75rem;
    position: relative;
    animation: toast-in 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .toast.success { border-color: var(--color-success-foreground); }
  .toast.error { border-color: var(--color-error-foreground); }
  .toast.info { border-color: var(--color-info-foreground); }
  .toast.warning { border-color: var(--color-warning-foreground); }
  .toast-icon { display: flex; align-items: center; color: inherit; opacity: 0.85; }
  .toast.success .toast-icon { color: var(--color-success-foreground); }
  .toast.error .toast-icon { color: var(--color-error-foreground); }
  .toast.info .toast-icon { color: var(--color-info-foreground); }
  .toast.warning .toast-icon { color: var(--color-warning-foreground); }
  .toast-message { flex: 1; margin-right: 0.5rem; word-break: break-word; }
  .toast-close {
    background: none; border: none; color: var(--muted-foreground);
    cursor: pointer; padding: 0.25rem; border-radius: var(--radius-full);
    transition: background 0.2s; display: flex; align-items: center;
  }
  .toast-close:hover { background: rgba(var(--surface-alt-rgb), 1); color: var(--color-error-foreground); }
  .toast-close:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  @media (max-width: 600px) {
    .toast-container { top: 0.5rem; right: 0.5rem; }
    .toast { min-width: 160px; max-width: 90vw; font-size: 0.875rem; padding: 0.5rem 0.75rem; }
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(32px); }
    to { opacity: 1; transform: none; }
  }
</style>
