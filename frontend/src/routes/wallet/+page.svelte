<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { Wallet, ChevronRight } from '@lucide/svelte';
import PageLayout from '$lib/components/layouts/PageLayout.svelte';
import EmptyState from '$lib/components/EmptyState.svelte';

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

<PageLayout title="Mis Billeteras">

  {#if loading}
    <div class="loading-list">
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
    </div>
  {:else if wallets.length === 0}
    <EmptyState icon={Wallet} title="No tienes billeteras" message="Crea una para empezar a operar" />
  {:else}
    <div class="wallet-list">
      {#each wallets as w}
        <button class="wallet-item" onclick={() => goto(`/wallet/detail?id=${w.id}`)}>
          <div class="wallet-icon"><Wallet size={20} /></div>
          <div class="wallet-info">
            <span class="wallet-name">{w.name || `Wallet #${w.id}`}</span>
            <span class="wallet-balance">Bs. {Number(w.balance).toFixed(2)}</span>
            <span class="wallet-available">Disponible: Bs. {Number(w.available_balance).toFixed(2)}</span>
          </div>
          <ChevronRight size={18} class="wallet-arrow" />
        </button>
      {/each}
    </div>
  {/if}

</PageLayout>

<style>
  .loading-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .skeleton-row { height: 80px; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  .wallet-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .wallet-item { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-xl); cursor: pointer; text-align: left; width: 100%; }
  .wallet-item:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .wallet-icon { width: 48px; height: 48px; border-radius: var(--radius-lg); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wallet-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .wallet-name { font-weight: 600; font-size: var(--text-base); color: rgba(var(--text-primary-rgb), 1); }
  .wallet-balance { font-size: var(--text-lg); font-weight: 700; color: var(--primary); }
  .wallet-available { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); }

</style>
