<script lang="ts">
  import { onMount } from 'svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { RefreshCw, List } from '@lucide/svelte';

  let pending: any[] = [];
  let logs: any[] = [];
  let loading = true;
  let accountId = '';
  let reconciling = false; let result = '';

  onMount(async () => {
    try {
      const res = await api.getPendingReconciliations();
      if (res.success) pending = res.data || [];
    } catch {}
    finally { loading = false; }
  });

  async function handleReconcile() {
    if (!accountId) return;
    reconciling = true; result = '';
    try {
      const res = await api.reconcileAccount(accountId);
      if (res.success) { result = `Reconciliación completada: ${res.data?.results?.length || 0} transacciones`; }
      else result = res.message || 'Error';
    } catch (e: any) { result = e.message; }
    finally { reconciling = false; }
  }

  async function handleLoadLogs() {
    if (!accountId) return;
    try {
      const res = await api.getReconciliationLogs(accountId);
      if (res.success) logs = res.data || [];
    } catch {}
  }
</script>

<RouteLayout title="Reconciliación">
  <div class="card">
    <Input id="acc" label="ID de cuenta" bind:value={accountId} placeholder="Account ID" />
    <div class="actions">
      <Button on:click={handleReconcile} loading={reconciling}><RefreshCw size={16} /> Reconciliar</Button>
      <Button variant="ghost" on:click={handleLoadLogs}><List size={16} /> Ver logs</Button>
    </div>
    {#if result}<div class="msg">{result}</div>{/if}
  </div>

  {#if pending.length > 0}
    <div class="section">
      <h3>Pendientes ({pending.length})</h3>
      {#each pending as p}
        <div class="item">
          <span class="ref">{p.external_reference || p.id}</span>
          <span class={`status ${p.status}`}>{p.status}</span>
          <span class="diff">Bs. {Number(p.difference).toFixed(2)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if logs.length > 0}
    <div class="section">
      <h3>Logs</h3>
      {#each logs as l}
        <div class="item">
          <span>{new Date(l.created_at).toLocaleDateString()}</span>
          <span class={`status ${l.status}`}>{l.status}</span>
          <span class="diff">Bs. {Number(l.difference).toFixed(2)}</span>
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .card { background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); margin-bottom: 1rem; }
  .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  .msg { margin-top: 0.5rem; padding: 0.5rem; border-radius: 6px; background: #e8f5e9; color: #2e7d32; font-size: 0.85rem; }
  .section { background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); }
  .section h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .item:last-child { border: none; }
  .status { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 99px; }
  .status.matched { background: #e8f5e9; color: #2e7d32; }
  .status.mismatch { background: #ffebee; color: #c62828; }
  .status.pending { background: #fff3e0; color: #e65100; }
  .diff { font-family: monospace; font-weight: 600; }
  .ref { color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
