<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { ArrowRightLeft, History, Send, Split, Users } from '@lucide/svelte';
</script>

<RouteLayout title="Transferencias">
  <div class="grid">
    <button class="action-card" on:click={() => goto('/transfers/p2p')}>
      <div class="icon send"><Send size={24} /></div>
      <h3>Transferir ahora</h3>
      <p>Envía dinero a otra billetera al instante</p>
    </button>
    <button class="action-card" on:click={() => goto('/split')}>
      <div class="icon split"><Split size={24} /></div>
      <h3>Pago compartido</h3>
      <p>Divide el pago entre varias personas</p>
    </button>
    <button class="action-card" on:click={() => goto('/subscriptions')}>
      <div class="icon sub"><ArrowRightLeft size={24} /></div>
      <h3>Suscripciones</h3>
      <p>Pagos recurrentes automáticos</p>
    </button>
    <button class="action-card" on:click={() => goto('/transactions')}>
      <div class="icon history"><History size={24} /></div>
      <h3>Historial</h3>
      <p>Movimientos y transacciones</p>
    </button>
  </div>
</RouteLayout>

<style>
  .grid { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem 0; }
  .action-card {
    display: flex; flex-direction: column; gap: 0.25rem;
    padding: 1.25rem; border-radius: 12px;
    background: var(--surface); border: 1px solid var(--border);
    cursor: pointer; transition: all 0.2s; text-align: left;
  }
  .action-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
  .send { background: #e3f2fd; color: #1976d2; }
  .split { background: #f3e5f5; color: #7b1fa2; }
  .sub { background: #e8f5e9; color: #388e3c; }
  .history { background: #fff3e0; color: #f57c00; }
  h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  p { margin: 0; font-size: 0.8rem; color: var(--text-secondary); }
</style>
