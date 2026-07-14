<script lang="ts">
  import { onMount } from 'svelte';
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

<div class="page-header">
  <span class="page-header-title">Reconciliación</span>
</div>

<div class="page-content" style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
  <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-4)">
    <Input id="acc" label="ID de cuenta" bind:value={accountId} placeholder="Account ID" />
    <div style="display:flex;gap:var(--space-3)">
      <Button onclick={handleReconcile} loading={reconciling}><RefreshCw size={16} /> Reconciliar</Button>
      <Button variant="ghost" onclick={handleLoadLogs}><List size={16} /> Ver logs</Button>
    </div>
    {#if result}
      <div style="padding:0.75rem;border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{result}</div>
    {/if}
  </div>

  {#if pending.length > 0}
    <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-2)">
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);margin-bottom:var(--space-1)">Pendientes ({pending.length})</div>
      {#each pending as p}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--border);font-size:var(--text-sm)">
          <span style="color:var(--text-secondary);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{p.external_reference || p.id}</span>
          <span class={p.status === 'matched' ? 'badge badge-success' : p.status === 'pending' ? 'badge badge-warning' : 'badge badge-error'}>{p.status}</span>
          <span style="font-family:monospace;font-weight:600;color:var(--text-primary)">Bs. {Number(p.difference).toFixed(2)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if logs.length > 0}
    <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-2)">
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);margin-bottom:var(--space-1)">Logs</div>
      {#each logs as l}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--border);font-size:var(--text-sm)">
          <span style="color:var(--text-secondary)">{new Date(l.created_at).toLocaleDateString()}</span>
          <span class={l.status === 'matched' ? 'badge badge-success' : l.status === 'pending' ? 'badge badge-warning' : 'badge badge-error'}>{l.status}</span>
          <span style="font-family:monospace;font-weight:600;color:var(--text-primary)">Bs. {Number(l.difference).toFixed(2)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
