<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import Section from '$lib/components/Section.svelte';
  import { Calendar, Plus, XCircle } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let subscriptions: any[] = [];
  let loading = true;
  let error = '';
  let showForm = false;
  let receiverWalletId = '';
  let amount = 0;
  let interval: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
  let subDescription = '';
  let maxPaymentsStr = '0';
  let saving = false;

  const intervals = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  onMount(async () => {
    try {
      const res: any = await api.listSubscriptions();
      if (res.success) subscriptions = res.data?.data || [];
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  });

  async function handleCreate() {
    if (!receiverWalletId || amount <= 0) return;
    saving = true; error = '';
    try {
      const res: any = await api.createSubscription({
        walletId: '', receiverWalletId, amount, interval,
        description: subDescription || undefined,
        maxPayments: parseInt(maxPaymentsStr) > 0 ? parseInt(maxPaymentsStr) : undefined,
      });
      if (res && res.success !== false) {
        subscriptions = [res.data ?? res, ...subscriptions];
        showForm = false; receiverWalletId = ''; amount = 0; subDescription = ''; maxPaymentsStr = '0';
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

<PageLayout title="Suscripciones">
  {#snippet actions()}
    <PillButton label="Nueva" onClick={() => showForm = !showForm} />
  {/snippet}

  {#if showForm}
    <Section label="Nueva suscripción">
      <div class="form">
        <TextField label="Billetera destino" bind:value={receiverWalletId} placeholder="ID billetera" />
        <AmountField label="Monto (Bs)" bind:value={amount} />
        <div class="select-group">
          <span class="field-label">Frecuencia</span>
          <select class="native-select" bind:value={interval}>
            {#each intervals as it}<option value={it.value}>{it.label}</option>{/each}
          </select>
        </div>
        <TextField label="Descripción" bind:value={subDescription} placeholder="Opcional" />
        <TextField label="Máx. pagos (0=ilimitado)" type="number" bind:value={maxPaymentsStr} placeholder="0" />
        {#if error}<div class="msg error">{error}</div>{/if}
        <div class="form-actions">
          <GhostButton onClick={() => showForm = false}>Cancelar</GhostButton>
          <PillButton label="Crear" onClick={handleCreate} loading={saving} />
        </div>
      </div>
    </Section>
  {/if}

  {#if loading}
    <Skeleton width="100%" height="58px" radius="lg" count={3} gap="space-2" />
  {:else if subscriptions.length === 0}
    <EmptyState icon={Calendar} title="No tienes suscripciones activas" />
  {:else}
    <div class="sub-list">
      {#each subscriptions as sub}
        <div class="sub-card" class:inactive={!sub.is_active}>
          <div class="sub-body">
            <span class="sub-badge">{sub.interval_type}</span>
            <div class="sub-amount">Bs. {Number(sub.amount).toFixed(2)}</div>
            <div class="sub-desc">{sub.description || 'Sin descripción'}</div>
            <div class="sub-count">{sub.payment_count} pagos realizados</div>
          </div>
          {#if sub.is_active}
            <button class="sub-cancel" onclick={() => handleCancel(sub.id)} aria-label="Cancelar suscripción">
              <XCircle size={18} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .select-group { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: rgba(var(--text-secondary-rgb), 1); }
  .native-select { width: 100%; padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); height: 44px; outline: none; }
  .native-select:focus { border-color: rgba(var(--primary-rgb), 0.6); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .form-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
  .sub-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .sub-card { display: flex; align-items: flex-start; gap: var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .sub-card.inactive { opacity: 0.5; }
  .sub-body { flex: 1; min-width: 0; }
  .sub-badge { font-size: 0.7rem; background: var(--primary); color: rgba(var(--bg-rgb), 1); padding: 0.15rem 0.5rem; border-radius: 999px; display: inline-block; margin-bottom: 0.25rem; text-transform: uppercase; }
  .sub-amount { font-weight: 700; font-size: var(--text-lg); margin: 0.25rem 0; color: rgba(var(--text-primary-rgb), 1); }
  .sub-desc { margin: 0; font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .sub-count { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); }
  .sub-cancel { background: none; border: none; color: rgba(var(--error-rgb), 1); cursor: pointer; padding: var(--space-2); flex-shrink: 0; }
</style>
