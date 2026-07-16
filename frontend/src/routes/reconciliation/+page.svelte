<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import { RefreshCw, List } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';

  let pending: any[] = [];
  let logs: any[] = [];
  let loading = true;
  let accountId = '';
  let reconciling = false; let result = '';

  onMount(async () => {
    try {
      const res: any = await api.getPendingReconciliations();
      if (res.success) pending = res.data?.data || [];
    } catch {}
    finally { loading = false; }
  });

  async function handleReconcile() {
    if (!accountId) return;
    reconciling = true; result = '';
    try {
      const res: any = await api.reconcileAccount(accountId);
      if (res && res.success !== false) { result = `Reconciliación completada: ${(res.data?.results || res.results || []).length} transacciones`; }
      else result = res.message || 'Error';
    } catch (e: any) { result = e.message; }
    finally { reconciling = false; }
  }

  async function handleLoadLogs() {
    if (!accountId) return;
    try {
      const res: any = await api.getReconciliationLogs(accountId);
      if (res.success) logs = res.data?.data || [];
    } catch {}
  }
</script>

<PageLayout title="Reconciliación">

  <Section label="">
    <TextField label="ID de cuenta" bind:value={accountId} placeholder="Account ID" />
    <div class="recon-actions">
      <PillButton label="Reconciliar" onClick={handleReconcile} loading={reconciling} />
      <GhostButton onClick={handleLoadLogs}><List size={16} /> Ver logs</GhostButton>
    </div>
    {#if result}<div class="msg success">{result}</div>{/if}
  </Section>

  {#if pending.length > 0}
    <Section label="Pendientes ({pending.length})">
      {#each pending as p}
        <div class="recon-row">
          <span class="recon-ref">{p.external_reference || p.id}</span>
          <span class="badge badge-{p.status === 'matched' ? 'success' : p.status === 'pending' ? 'warning' : 'error'}">{p.status}</span>
          <span class="recon-amount">Bs. {Number(p.difference).toFixed(2)}</span>
        </div>
      {/each}
    </Section>
  {/if}

  {#if logs.length > 0}
    <Section label="Logs">
      {#each logs as l}
        <div class="recon-row">
          <span class="recon-ref">{new Date(l.created_at).toLocaleDateString()}</span>
          <span class="badge badge-{l.status === 'matched' ? 'success' : l.status === 'pending' ? 'warning' : 'error'}">{l.status}</span>
          <span class="recon-amount">Bs. {Number(l.difference).toFixed(2)}</span>
        </div>
      {/each}
    </Section>
  {/if}
</PageLayout>

<style>

  .recon-actions { display: flex; gap: var(--space-3); align-items: center; }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
  .recon-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid rgba(var(--border-rgb), 0.3); font-size: var(--text-sm); }
  .recon-row:last-child { border-bottom: none; }
  .recon-ref { color: rgba(var(--text-secondary-rgb), 1); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .recon-amount { font-family: monospace; font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .badge { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 500; }
  .badge-success { background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); }
  .badge-warning { background: rgba(var(--warning-rgb), 0.15); color: rgba(var(--warning-rgb), 1); }
  .badge-error { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
</style>
