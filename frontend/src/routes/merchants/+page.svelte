<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { ArrowLeft, Store, Plus, QrCode } from '@lucide/svelte';

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

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Comercios</h1>
  <div style="display:flex;align-items:center;gap:var(--space-2)">
    <Button onclick={() => goto('/merchants/register')} size="sm"><Plus size={16} /> Registrar</Button>
  </div>
</div>

<div class="page-content">
  {#if loading}
    <p style="text-align:center;padding:var(--space-8);color:var(--text-secondary);font-size:var(--text-sm)">Cargando...</p>
  {:else if merchants.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:var(--space-12) var(--space-4);color:var(--text-secondary)">
      <Store size={48} style="color:var(--text-tertiary)" />
      <p style="font-size:var(--text-sm)">No tienes comercios registrados</p>
      <Button variant="ghost" onclick={() => goto('/merchants/register')}>Registrar ahora</Button>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      {#each merchants as m}
        <button class="section-card" style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer;text-align:left;width:100%;border:none" onclick={() => goto(`/merchants/${m.id}`)}>
          <div style="width:40px;height:40px;border-radius:var(--radius-lg);background:var(--success-bg);color:var(--success-color);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <Store size={20} />
          </div>
          <div style="flex:1">
            <h4 style="margin:0;font-size:var(--text-sm);font-weight:600">{m.business_name}</h4>
            <p style="margin:2px 0 0;font-size:var(--text-xs);color:var(--text-secondary)">{m.business_category} • {m.is_verified ? 'Verificado' : 'Pendiente'}</p>
          </div>
          <QrCode size={18} style="color:var(--text-tertiary);flex-shrink:0" />
        </button>
      {/each}
    </div>
  {/if}
</div>
