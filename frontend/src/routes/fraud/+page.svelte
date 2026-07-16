<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { ShieldAlert, ShieldCheck } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

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

<PageLayout title="Detección de Fraude">

  {#if loading}
    <Skeleton width="100%" height="58px" radius="lg" count={3} gap="space-2" />
  {:else if alerts.length === 0}
    <EmptyState icon={ShieldCheck} title="No hay alertas de seguridad activas" />
  {:else}
    <div class="alert-list">
      {#each alerts as a}
        <div class="alert-card">
          <div class="alert-icon"><ShieldAlert size={20} /></div>
          <div class="alert-body">
            <h4>{a.alert_type}</h4>
            <p>{a.description}</p>
            <span class="severity-badge severity-{a.severity}">{a.severity}</span>
          </div>
          <PillButton label="Resolver" onClick={() => handleResolve(a.id)} />
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .alert-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .alert-card { display: flex; align-items: flex-start; gap: var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .alert-icon { color: rgba(var(--error-rgb), 1); flex-shrink: 0; margin-top: var(--space-1); }
  .alert-body { flex: 1; }
  .alert-body h4 { margin: 0; font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .alert-body p { margin: var(--space-1) 0; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .severity-badge { display: inline-block; font-size: var(--text-xs); padding: 2px var(--space-2); border-radius: var(--radius-full); font-weight: 500; }
  .severity-high { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .severity-medium { background: rgba(var(--warning-rgb), 0.15); color: rgba(var(--warning-rgb), 1); }
  .severity-low { background: rgba(var(--info-rgb), 0.15); color: rgba(var(--info-rgb), 1); }
</style>
