<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { ArrowLeft, ShieldAlert, ShieldCheck } from '@lucide/svelte';

  let alerts: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await api.getFraudAlerts();
      if (res.success) alerts = res.data || [];
    } catch {}
    finally { loading = false; }
  });

  async function handleResolve(id: string) {
    try {
      await api.resolveFraudAlert(id);
      alerts = alerts.filter(a => a.id !== id);
    } catch {}
  }
</script>

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Alertas de fraude</h1>
</div>

<div class="page-content">
  {#if loading}
    <p style="text-align:center;padding:var(--space-8);color:var(--text-secondary);font-size:var(--text-sm)">Cargando...</p>
  {:else if alerts.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:var(--space-12) var(--space-4);color:var(--text-secondary)">
      <ShieldCheck size={48} style="color:var(--success-color)" />
      <p style="font-size:var(--text-sm)">No hay alertas de seguridad activas</p>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      {#each alerts as a}
        <div class="section-card" style="display:flex;align-items:flex-start;gap:var(--space-3)">
          <div style="color:var(--error-color);flex-shrink:0"><ShieldAlert size={20} /></div>
          <div style="flex:1">
            <h4 style="margin:0;font-size:var(--text-sm);font-weight:600">{a.alert_type}</h4>
            <p style="margin:var(--space-1) 0;font-size:var(--text-xs);color:var(--text-secondary)">{a.description}</p>
            <span style="font-size:var(--text-xs);padding:2px var(--space-2);border-radius:var(--radius-full);background:{a.severity === 'high' ? 'var(--error-bg)' : 'var(--warning-bg)'};color:{a.severity === 'high' ? 'var(--error-color)' : 'var(--warning-color)'}">{a.severity}</span>
          </div>
          <Button size="sm" variant="ghost" onclick={() => handleResolve(a.id)}>Resolver</Button>
        </div>
      {/each}
    </div>
  {/if}
</div>
