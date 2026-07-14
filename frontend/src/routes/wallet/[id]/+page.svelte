<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
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

<RouteLayout title={wallet?.name || 'Billetera'}>
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if wallet}
    <div class="hero">
      <h1>Bs. {Number(wallet.balance).toFixed(2)}</h1>
      <p>Disponible: Bs. {Number(wallet.available_balance).toFixed(2)}</p>
    </div>

    <div class="actions">
      <button class="action-btn" on:click={() => goto('/transfers/p2p')}>
        <ArrowLeftRight /> Transferir
      </button>
      <button class="action-btn" on:click={() => goto('/transactions')}>
        <History /> Historial
      </button>
    </div>

    <div class="section">
      <h3>Respaldo de seguridad</h3>
      {#if backupStatus?.verified}
        <div class="verified">✅ Respaldo verificado</div>
      {:else if seedPhrase}
        <div class="seed-phrase">
          {#each seedPhrase as word, i}
            <span class="word">{i + 1}. {word}</span>
          {/each}
        </div>
        <p class="warning">⚠️ Guarda estas 12 palabras en un lugar seguro. Nadie más te las pedirá.</p>
        <Button on:click={handleVerify} size="sm">Verificar respaldo</Button>
      {:else}
        <p class="desc">Protege tu billetera con una frase semilla</p>
        <Button on:click={handleBackup} loading={backingUp} fullWidth>
          <ShieldCheck size={16} /> Crear respaldo
        </Button>
      {/if}
    </div>
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .hero { text-align: center; padding: 1.5rem; }
  .hero h1 { font-size: 2rem; margin: 0; color: var(--primary); }
  .hero p { margin: 0.25rem 0 0; color: var(--text-secondary); }
  .actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.9rem; color: var(--text-primary); }
  .action-btn:hover { background: var(--hover); }
  .section { background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); }
  .section h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .verified { color: #2e7d32; font-weight: 600; }
  .desc { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .seed-phrase { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem; }
  .word { background: var(--background); padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; font-family: monospace; }
  .warning { font-size: 0.8rem; color: #e65100; padding: 0.5rem; background: #fff3e0; border-radius: 6px; }
</style>
