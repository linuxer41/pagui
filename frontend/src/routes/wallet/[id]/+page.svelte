<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { ShieldCheck, ArrowLeftRight, Download, History } from '@lucide/svelte';

  let wallet: any = null; let backupStatus: any = null;
  let seedPhrase: string[] | null = null;
  let loading = true; let backingUp = false;

  onMount(async () => {
    try {
      const res = await api.get(`/wallets/${$page.params.id}`);
      if (res.success) wallet = res.data;
      const bk = await api.getWalletBackupStatus($page.params.id);
      if (bk.success) backupStatus = bk.data;
    } catch {}
    finally { loading = false; }
  });

  async function handleBackup() {
    backingUp = true;
    try {
      const res = await api.createWalletBackup($page.params.id);
      if (res.success) {
        seedPhrase = res.data.seedPhrase;
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

<div class="page-header">
  <button class="page-header-back" onclick={() => goto('/wallet')}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <span class="page-header-title">{wallet?.name || 'Billetera'}</span>
</div>
<div class="page-content">
  {#if loading}
    <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Cargando...</div>
  {:else if wallet}
    <div style="text-align:center;padding:1.5rem 0">
      <div style="font-size:2rem;font-weight:700;margin:0;color:var(--primary-color)">Bs. {Number(wallet.balance).toFixed(2)}</div>
      <div style="margin:0.25rem 0 0;color:var(--text-secondary);font-size:var(--text-sm)">Disponible: Bs. {Number(wallet.available_balance).toFixed(2)}</div>
    </div>

    <div style="display:flex;gap:var(--space-4);padding-bottom:1.25rem">
      <button style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer;font-size:0.9rem;color:var(--text-primary);transition:all var(--duration-fast) var(--ease-out)" onclick={() => goto('/transfers/p2p')}>
        <ArrowLeftRight size={18} /> Transferir
      </button>
      <button style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer;font-size:0.9rem;color:var(--text-primary);transition:all var(--duration-fast) var(--ease-out)" onclick={() => goto('/transactions')}>
        <History size={18} /> Historial
      </button>
    </div>

    <div class="section-card">
      <div style="font-weight:600;font-size:0.95rem;margin-bottom:0.75rem">Respaldo de seguridad</div>
      {#if backupStatus?.verified}
        <div style="color:var(--success-color);font-weight:600;display:flex;align-items:center;gap:0.5rem">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Respaldo verificado
        </div>
      {:else if seedPhrase}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem">
          {#each seedPhrase as word, i}
            <div style="background:var(--bg-primary);padding:0.5rem;border-radius:var(--radius-lg);font-size:0.85rem;font-family:monospace">{i + 1}. {word}</div>
          {/each}
        </div>
        <div style="font-size:var(--text-sm);color:var(--warning-color);padding:0.5rem;background:var(--warning-bg);border-radius:var(--radius-lg);margin-bottom:0.75rem">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M12 9v4"/><path d="M10.363 3.591 1.5 20.06a1 1 0 0 0 .874 1.44h19.252a1 1 0 0 0 .874-1.44l-8.863-16.469a1 1 0 0 0-1.748 0Z"/><path d="M12 16h.01"/></svg>
          Guarda estas 12 palabras en un lugar seguro. Nadie más te las pedirá.
        </div>
        <Button onclick={handleVerify} size="sm">Verificar respaldo</Button>
      {:else}
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:0.75rem">Protege tu billetera con una frase semilla</div>
        <Button onclick={handleBackup} loading={backingUp} fullWidth>
          <ShieldCheck size={16} /> Crear respaldo
        </Button>
      {/if}
    </div>
  {/if}
</div>
