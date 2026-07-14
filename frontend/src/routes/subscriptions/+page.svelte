<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
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

<RouteLayout title="Suscripciones">
  <div class="header-actions">
    <Button on:click={() => showForm = !showForm} size="sm">
      <Plus size={16} /> Nueva
    </Button>
  </div>

  {#if showForm}
    <div class="form-card">
      <h3>Nueva suscripción</h3>
      <Input id="rec" label="Billetera destino" bind:value={receiverWalletId} placeholder="ID billetera" />
      <Input id="amt" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
      <Select id="int" label="Frecuencia" options={intervals} bind:value={interval} />
      <Input id="desc" label="Descripción" bind:value={subDescription} placeholder="Opcional" />
      <Input id="max" label="Máx. pagos (0=ilimitado)" type="number" bind:value={maxPayments} placeholder="0" />
      {#if error}<div class="msg error">{error}</div>{/if}
      <div class="form-actions">
        <Button variant="ghost" on:click={() => showForm = false}>Cancelar</Button>
        <Button on:click={handleCreate} loading={saving}>Crear</Button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if subscriptions.length === 0}
    <div class="empty">
      <Calendar size={48} />
      <p>No tienes suscripciones activas</p>
    </div>
  {:else}
    <div class="list">
      {#each subscriptions as sub}
        <div class="card" class:inactive={!sub.is_active}>
          <div class="card-body">
            <span class="badge">{sub.interval_type}</span>
            <h4>Bs. {Number(sub.amount).toFixed(2)}</h4>
            <p>{sub.description || 'Sin descripción'}</p>
            <small>{sub.payment_count} pagos realizados</small>
          </div>
          {#if sub.is_active}
            <button class="cancel-btn" on:click={() => handleCancel(sub.id)} aria-label="Cancelar suscripción">
              <XCircle size={18} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .header-actions { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
  .form-card { background: var(--surface); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); }
  .form-card h3 { margin: 0 0 1rem; font-size: 1rem; }
  .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .msg { padding: 0.5rem; background: #ffebee; color: #c62828; border-radius: 8px; font-size: 0.85rem; }
  .loading { text-align: center; color: var(--text-secondary); padding: 2rem; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.75rem; }
  .card { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); }
  .card.inactive { opacity: 0.5; }
  .badge { font-size: 0.7rem; background: var(--primary); color: white; padding: 0.15rem 0.5rem; border-radius: 99px; display: inline-block; margin-bottom: 0.25rem; }
  .card-body h4 { margin: 0.25rem 0; font-size: 1.1rem; }
  .card-body p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
  .card-body small { font-size: 0.75rem; color: var(--text-secondary); }
  .cancel-btn { background: none; border: none; color: #ef5350; cursor: pointer; padding: 0.5rem; }
</style>
