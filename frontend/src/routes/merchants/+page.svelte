<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Store, Plus, QrCode } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let merchants: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res: any = await api.get('merchants/');
      if (res && res.success !== false) merchants = res.data?.data || res.data || res || [];
    } catch {}
    finally { loading = false; }
  });
</script>

<PageLayout title="Mis Comercios">
  <div style="display: flex; justify-content: flex-end;">
    <PillButton label="Registrar" onClick={() => goto('/merchants/register')} />
  </div>

  {#if loading}
    <Skeleton width="100%" height="80px" radius="md" count={3} gap="space-2" />
  {:else if merchants.length === 0}
    <EmptyState icon={Store} title="No tienes comercios registrados" action="Registrar ahora" onaction={() => goto('/merchants/register')} />
  {:else}
    <div class="merchant-list">
      {#each merchants as m}
        <button class="merchant-card" onclick={() => goto(`/merchants/${m.id}`)}>
          <div class="merchant-icon"><Store size={20} /></div>
          <div class="merchant-info">
            <h4>{m.business_name}</h4>
            <p>{m.business_category} • {m.is_verified ? 'Verificado' : 'Pendiente'}</p>
          </div>
          <QrCode size={18} class="merchant-qr-icon" />
        </button>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .merchant-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .merchant-card { display: flex; align-items: center; gap: var(--space-3); cursor: pointer; text-align: left; width: 100%; border: none; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .merchant-card:active { border-color: var(--primary); }
  .merchant-icon { width: 40px; height: 40px; border-radius: var(--radius-lg); background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .merchant-info { flex: 1; }
  .merchant-info h4 { margin: 0; font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .merchant-info p { margin: 2px 0 0; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }

</style>
