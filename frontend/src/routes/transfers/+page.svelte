<script lang="ts">
  import { goto } from '$app/navigation'
  import { Send, Split, History, ChevronRight } from '@lucide/svelte'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
</script>

<PageLayout title="Transferencias">

  <div class="page-body">
    <button class="menu-item" onclick={() => goto('/transfers/p2p')}>
      <div class="menu-icon" style="background: rgba(var(--primary-rgb), 0.15); color: var(--primary);">
        <Send size={20} />
      </div>
      <div class="menu-text">
        <strong>Transferir ahora</strong>
        <span>Envía dinero a otra billetera al instante</span>
      </div>
      <ChevronRight size={16} class="menu-chevron" />
    </button>
    <button class="menu-item" onclick={() => goto('/split')}>
      <div class="menu-icon" style="background: rgba(var(--amber-rgb),0.15); color: rgba(var(--amber-rgb),1);">
        <Split size={20} />
      </div>
      <div class="menu-text">
        <strong>Pago compartido</strong>
        <span>Divide el pago entre varias personas</span>
      </div>
      <ChevronRight size={16} class="menu-chevron" />
    </button>
    <button class="menu-item" onclick={() => goto('/transactions')}>
      <div class="menu-icon" style="background: rgba(var(--text-tertiary-rgb),0.15); color: rgba(var(--text-secondary-rgb),1);">
        <History size={20} />
      </div>
      <div class="menu-text">
        <strong>Historial</strong>
        <span>Movimientos y transacciones</span>
      </div>
      <ChevronRight size={16} class="menu-chevron" />
    </button>
  </div>
</PageLayout>

<style>
  .page-body { display: flex; flex-direction: column; gap: var(--space-2); }
  .menu-item {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-3); border: none; background: none;
    border-radius: var(--radius-lg); cursor: pointer;
    text-align: left; width: 100%; color: inherit;
  }
  .menu-item:active { background: rgba(var(--surface-rgb), 1); }
  .menu-icon {
    width: 44px; height: 44px; border-radius: var(--radius-full);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .menu-text {
    flex: 1; display: flex; flex-direction: column; gap: 2px;
  }
  .menu-text strong { font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); }
  .menu-text span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }

</style>
