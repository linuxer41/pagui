<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import api from '$lib/api';
  import { Calendar, Plus, Trash2, XCircle } from '@lucide/svelte';

  let subscriptions: any[] = [];
  let loading = true;
  let error = '';

  let showForm = false;
  let receiverWalletId = '';
  let amount = 0;
  let interval = 'monthly';
  let subDescription = '';
  let maxPayments = 0;
  let saving = false;

  const intervals = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  onMount(async () => {
    try {
      const res = await api.listSubscriptions();
      if (res.success) subscriptions = res.data || [];
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  });

  async function handleCreate() {
    if (!receiverWalletId || amount <= 0) return;
    saving = true; error = '';
    try {
      const res = await api.createSubscription({
        walletId: '', receiverWalletId, amount, interval,
        description: subDescription || undefined,
        maxPayments: maxPayments > 0 ? maxPayments : undefined,
      });
      if (res.success) {
        subscriptions = [res.data, ...subscriptions];
        showForm = false; receiverWalletId = ''; amount = 0; subDescription = ''; maxPayments = 0;
      } else { error = res.message || 'Error'; }
    } catch (e: any) { error = e.message; }
    finally { saving = false; }
  }

  async function handleCancel(id: string) {
    try {
      await api.cancelSubscription(id);
      subscriptions = subscriptions.map(s => s.id === id ? { ...s, is_active: false } : s);
    } catch {}
  }
</script>

<div class="page-header">
  <span class="page-header-title">Suscripciones</span>
  <div style="margin-left:auto">
    <Button onclick={() => showForm = !showForm} size="sm">
      <Plus size={16} /> Nueva
    </Button>
  </div>
</div>
<div class="page-content">
  {#if showForm}
    <div class="section-card" style="margin-top:0;margin-bottom:var(--space-4)">
      <div style="font-weight:600;font-size:1rem;margin-bottom:1.25rem">Nueva suscripción</div>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <Input id="rec" label="Billetera destino" bind:value={receiverWalletId} placeholder="ID billetera" />
        <Input id="amt" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
        <Select id="int" label="Frecuencia" options={intervals} bind:value={interval} />
        <Input id="desc" label="Descripción" bind:value={subDescription} placeholder="Opcional" />
        <Input id="max" label="Máx. pagos (0=ilimitado)" type="number" bind:value={maxPayments} placeholder="0" />
        {#if error}
          <div style="padding:0.5rem;background:var(--error-bg);color:var(--error-color);border-radius:var(--radius-lg);font-size:0.85rem">{error}</div>
        {/if}
        <div class="form-actions">
          <Button variant="ghost" onclick={() => showForm = false}>Cancelar</Button>
          <Button onclick={handleCreate} loading={saving}>Crear</Button>
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div style="text-align:center;color:var(--text-secondary);padding:2rem">Cargando...</div>
  {:else if subscriptions.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:3rem 1rem;color:var(--text-secondary)">
      <Calendar size={48} />
      <p style="margin:0;font-size:var(--text-sm)">No tienes suscripciones activas</p>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
      {#each subscriptions as sub}
        <div class="section-card" style="display:flex;align-items:center;justify-content:space-between;margin-top:0;gap:0.75rem;transition:opacity var(--duration-fast) var(--ease-out)" class:inactive={!sub.is_active}>
          <div style="flex:1;min-width:0">
            <span style="font-size:0.7rem;background:var(--primary-color);color:white;padding:0.15rem 0.5rem;border-radius:99px;display:inline-block;margin-bottom:0.25rem;text-transform:uppercase">{sub.interval_type}</span>
            <div style="font-weight:700;font-size:1.1rem;margin:0.25rem 0;color:var(--text-primary)">Bs. {Number(sub.amount).toFixed(2)}</div>
            <div style="margin:0;font-size:var(--text-sm);color:var(--text-secondary)">{sub.description || 'Sin descripción'}</div>
            <div style="font-size:var(--text-sm);color:var(--text-tertiary)">{sub.payment_count} pagos realizados</div>
          </div>
          {#if sub.is_active}
            <button style="background:none;border:none;color:var(--error-color);cursor:pointer;padding:0.5rem;flex-shrink:0" onclick={() => handleCancel(sub.id)} aria-label="Cancelar suscripción">
              <XCircle size={18} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
