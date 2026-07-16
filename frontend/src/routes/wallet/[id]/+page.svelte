<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { ShieldCheck, ArrowLeftRight, History, ShieldAlert, CheckCircle, AlertTriangle } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let wallet: any = null; let backupStatus: any = null;
  let seedPhrase: string | null = null;
  let loading = true; let backingUp = false;

  onMount(async () => {
    try {
      const res: any = await api.get(`/wallets/${$page.params.id}`);
      if (res && res.success !== false) wallet = res.data ?? res;
      const bk: any = await api.getWalletBackupStatus($page.params.id);
      if (bk && bk.success !== false) backupStatus = bk.data ?? bk;
    } catch {}
    finally { loading = false; }
  });

  async function handleBackup() {
    backingUp = true;
    try {
      const res = await api.createWalletBackup($page.params.id);
      if (res && res.success !== false) {
        seedPhrase = res.data?.seedPhrase ?? '';
        backupStatus = { verified: false };
      }
    } catch {}
    finally { backingUp = false; }
  }

  async function handleVerify() {
    try {
      await api.verifyWalletBackup($page.params.id);
      backupStatus = { verified: true };
    } catch {}
  }
</script>

<PageLayout title={wallet?.name || 'Billetera'}>

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

    <div class="backup-card">
      <span class="backup-title"><ShieldCheck size={16} /> Respaldo de seguridad</span>

      {#if backupStatus?.verified}
        <div class="backup-status verified"><CheckCircle size={18} /><span>Respaldo verificado</span></div>
      {:else if seedPhrase}
        <div class="seed-grid">
          {#each seedPhrase as word, i}
            <div class="seed-word">{i + 1}. {word}</div>
          {/each}
        </div>
        <div class="seed-warning"><AlertTriangle size={14} /><span>Guarda estas 12 palabras en un lugar seguro. Nadie más te las pedirá.</span></div>
        <PillButton label="Verificar respaldo" onClick={handleVerify} />
      {:else}
        <p class="backup-desc">Protege tu billetera con una frase semilla</p>
        <PillButton label="Crear respaldo" onClick={handleBackup} loading={backingUp} fullWidth />
      {/if}
    </div>
  {/if}
</PageLayout>

<style>

  .balance-card { text-align: center; padding: var(--space-8) var(--space-6); background: var(--primary); border-radius: var(--radius-2xl); position: relative; overflow: hidden; }
  .balance-label { font-size: var(--text-xs); font-weight: 500; opacity: 0.8; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: var(--space-1); color: rgba(var(--bg-rgb), 1); }
  .balance-amount { font-size: 2.25rem; font-weight: 800; letter-spacing: var(--tracking-tight); line-height: 1.1; color: rgba(var(--bg-rgb), 1); }
  .balance-sub { font-size: var(--text-sm); opacity: 0.7; margin-top: var(--space-2); color: rgba(var(--bg-rgb), 1); }
  .action-row { display: flex; gap: var(--space-3); }
  .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-xl); cursor: pointer; font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .action-btn:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .backup-card { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-2xl); padding: var(--space-6); border: 1px solid rgba(var(--border-rgb), 0.5); display: flex; flex-direction: column; gap: var(--space-4); }
  .backup-title { display: flex; align-items: center; gap: var(--space-2); font-weight: 600; font-size: var(--text-base); color: rgba(var(--text-primary-rgb), 1); }
  .backup-status { display: flex; align-items: center; gap: var(--space-2); font-weight: 600; font-size: var(--text-sm); }
  .backup-status.verified { color: rgba(var(--success-rgb), 1); }
  .backup-desc { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .seed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .seed-word { background: rgba(var(--bg-rgb), 1); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-family: var(--font-mono); color: rgba(var(--text-primary-rgb), 1); }
  .seed-warning { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--text-sm); color: rgba(var(--warning-rgb), 1); padding: var(--space-3) var(--space-4); background: rgba(var(--warning-rgb), 0.1); border-radius: var(--radius-lg); line-height: var(--leading-normal); }
  .seed-warning span { flex: 1; }
</style>
