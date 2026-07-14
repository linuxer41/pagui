<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
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

<div class="page-header">
  <span class="page-header-title">Billeteras</span>
</div>
<div class="page-content">
  {#if loading}
    <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Cargando...</div>
  {:else if wallets.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:3rem 1rem;color:var(--text-secondary)">
      <Wallet size={48} />
      <p style="margin:0;font-size:var(--text-sm)">No tienes billeteras</p>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
      {#each wallets as w}
        <button style="display:flex;align-items:center;gap:0.75rem;padding:1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);cursor:pointer;text-align:left;width:100%;transition:all var(--duration-fast) var(--ease-out)" onclick={() => goto(`/wallet/${w.id}`)}>
          <div style="width:44px;height:44px;border-radius:var(--radius-lg);background:var(--primary-subtle);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0"><Wallet size={20} /></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.95rem;color:var(--text-primary);margin:0">{w.name || `Wallet #${w.id}`}</div>
            <div style="font-size:1.1rem;font-weight:700;margin:0.2rem 0;color:var(--primary-color)">Bs. {Number(w.balance).toFixed(2)}</div>
            <div style="font-size:var(--text-sm);color:var(--text-tertiary);margin:0">Disponible: Bs. {Number(w.available_balance).toFixed(2)}</div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
