<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { Store, Plus, QrCode } from '@lucide/svelte';

  let merchants: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await api.get('merchants/');
      if (res.success) merchants = res.data || [];
    } catch {}
    finally { loading = false; }
  });
</script>

<RouteLayout title="Comercios">
  <div class="header-actions">
    <Button on:click={() => goto('/merchants/register')} size="sm"><Plus size={16} /> Registrar</Button>
  </div>

  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if merchants.length === 0}
    <div class="empty">
      <Store size={48} />
      <p>No tienes comercios registrados</p>
      <Button variant="ghost" on:click={() => goto('/merchants/register')}>Registrar ahora</Button>
    </div>
  {:else}
    <div class="list">
      {#each merchants as m}
        <button class="card" on:click={() => goto(`/merchants/${m.id}`)}>
          <div class="icon"><Store size={20} /></div>
          <div class="info">
            <h4>{m.business_name}</h4>
            <p>{m.business_category} • {m.is_verified ? 'Verificado' : 'Pendiente'}</p>
          </div>
          <QrCode size={18} class="arrow" />
        </button>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .header-actions { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
  .loading { text-align: center; color: var(--text-secondary); padding: 2rem; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; text-align: left; width: 100%; }
  .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .icon { width: 40px; height: 40px; border-radius: 10px; background: #e8f5e9; color: #388e3c; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .info { flex: 1; }
  .info h4 { margin: 0; font-size: 0.95rem; font-weight: 600; }
  .info p { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--text-secondary); }
  .arrow { color: var(--text-secondary); }
</style>
