<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { ArrowLeftRight, History, ArrowLeft } from '@lucide/svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let wallet: any = null;
  let loading = true;
  let walletId = $derived($page.url.searchParams.get('id'));

  onMount(async () => {
    if (!walletId) { loading = false; return; }
    try {
      const res: any = await api.get(`/wallets/${walletId}`);
      if (res && res.success !== false) wallet = res.data ?? res;
    } catch {}
    finally { loading = false; }
  });
</script>

<PageLayout title={wallet?.name || 'Billetera'}>
  <button class="back-btn" onclick={() => goto('/wallet')}><ArrowLeft size={18} /> Volver</button>

  {#if loading}
    <Skeleton width="100%" height="180px" radius="lg" count={1} />
  {:else if wallet}
    <div class="balance-card">
      <div class="balance-label">Saldo disponible</div>
      <div class="balance-amount">Bs. {Number(wallet.balance).toFixed(2)}</div>
      <div class="balance-sub">Disponible: Bs. {Number(wallet.available_balance).toFixed(2)}</div>
    </div>

    <div class="action-row">
      <button class="action-btn" onclick={() => goto('/transfers/p2p')}><ArrowLeftRight size={18} /><span>Transferir</span></button>
      <button class="action-btn" onclick={() => goto('/transactions')}><History size={18} /><span>Historial</span></button>
    </div>
  {:else}
    <p class="not-found">Billetera no encontrada</p>
  {/if}
</PageLayout>

<style>
  .back-btn { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); border: none; background: none; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); cursor: pointer; margin-bottom: var(--space-4); }
  .back-btn:active { opacity: 0.6; }
  .balance-card { text-align: center; padding: var(--space-8) var(--space-6); background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.35) 0%, #1a1a1a 60%); border-radius: var(--radius-2xl); position: relative; overflow: hidden; color: #fff; }
  .balance-card::before { content: ''; position: absolute; top: -40%; right: -20%; width: 200px; height: 200px; border-radius: 50%; background: rgba(var(--primary-rgb), 0.1); }
  .balance-label { font-size: var(--text-xs); font-weight: 500; opacity: 0.7; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: var(--space-1); color: #fff; position: relative; z-index: 1; }
  .balance-amount { font-size: 2.25rem; font-weight: 800; letter-spacing: var(--tracking-tight); line-height: 1.1; color: #fff; position: relative; z-index: 1; }
  .balance-sub { font-size: var(--text-sm); opacity: 0.6; margin-top: var(--space-2); color: #fff; position: relative; z-index: 1; }
  .action-row { display: flex; gap: var(--space-3); }
  .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-xl); cursor: pointer; font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .action-btn:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .not-found { text-align: center; padding: var(--space-8); color: rgba(var(--text-tertiary-rgb), 1); }
</style>
