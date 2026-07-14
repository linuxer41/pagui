<script lang="ts">
  import { onMount } from 'svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { ShieldAlert, ShieldCheck } from '@lucide/svelte';

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

<RouteLayout title="Alertas de fraude">
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if alerts.length === 0}
    <div class="empty">
      <ShieldCheck size={48} />
      <p>No hay alertas de seguridad activas</p>
    </div>
  {:else}
    <div class="list">
      {#each alerts as a}
        <div class="card">
          <div class="icon"><ShieldAlert size={20} /></div>
          <div class="info">
            <h4>{a.alert_type}</h4>
            <p>{a.description}</p>
            <span class="severity" class:high={a.severity === 'high'}>{a.severity}</span>
          </div>
          <Button size="sm" variant="ghost" on:click={() => handleResolve(a.id)}>Resolver</Button>
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .card { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: var(--surface); border-radius: 12px; border: 1px solid #ffcdd2; }
  .icon { color: #ef5350; flex-shrink: 0; }
  .info { flex: 1; }
  .info h4 { margin: 0; font-size: 0.9rem; }
  .info p { margin: 0.25rem 0; font-size: 0.8rem; color: var(--text-secondary); }
  .severity { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 99px; background: #fff3e0; color: #e65100; }
  .severity.high { background: #ffebee; color: #c62828; }
</style>
