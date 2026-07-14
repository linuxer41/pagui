<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { Wallet, Plus, Shield } from '@lucide/svelte';

  let wallets: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await api.listWallets();
      if (res.success) wallets = res.data || [];
    } catch {}
    finally { loading = false; }
  });
</script>

<RouteLayout title="Billeteras">
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if wallets.length === 0}
    <div class="empty">
      <Wallet size={48} />
      <p>No tienes billeteras</p>
    </div>
  {:else}
    <div class="list">
      {#each wallets as w}
        <button class="card" on:click={() => goto(`/wallet/${w.id}`)}>
          <div class="icon"><Wallet size={20} /></div>
          <div class="info">
            <h4>{w.name || `Wallet #${w.id}`}</h4>
            <p class="balance">Bs. {Number(w.balance).toFixed(2)}</p>
            <p class="available">Disponible: Bs. {Number(w.available_balance).toFixed(2)}</p>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; text-align: left; width: 100%; }
  .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .icon { width: 44px; height: 44px; border-radius: 12px; background: #e3f2fd; color: #1976d2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .info { flex: 1; }
  .info h4 { margin: 0; font-size: 0.95rem; font-weight: 600; }
  .balance { font-size: 1.1rem; font-weight: 700; margin: 0.2rem 0; color: var(--primary); }
  .available { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
</style>
