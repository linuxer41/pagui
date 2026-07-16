<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import { Store, QrCode } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let merchant: any = null;
  let qrImage = '';
  let loading = true;
  let payAmount = 0;
  let payWalletId = '';
  let payResult = '';
  let paying = false;

  onMount(async () => {
    try {
      const res: any = await api.get(`/merchants/${$page.params.id}`);
      if (res && res.success !== false) merchant = res.data ?? res;
    } catch {}
    finally { loading = false; }
  });

  async function handleGenerateQR() {
    try {
      const res: any = await api.getMerchantQR($page.params.id);
      if (res && res.success !== false) qrImage = res.data?.qrImage ?? res.qrImage;
    } catch {}
  }

  async function handlePay() {
    if (!payWalletId || payAmount <= 0) return;
    paying = true;
    try {
      const res: any = await api.merchantPay({ merchantId: $page.params.id, customerWalletId: payWalletId, amount: payAmount });
      if (res && res.success !== false) payResult = 'Pago exitoso';
      else payResult = res.message || 'Error';
    } catch (e: any) { payResult = e.message; }
    finally { paying = false; }
  }
</script>

<PageLayout title={merchant?.business_name || 'Comercio'}>

  {#if loading}
    <Skeleton width="100%" height="200px" radius="lg" count={1} />
  {:else if merchant}
    <div class="merchant-hero">
      <div class="merchant-hero-icon"><Store size={28} /></div>
      <h2>{merchant.business_name}</h2>
      <p>{merchant.business_category} <span class="sep">•</span> {#if merchant.is_verified}<span class="badge badge-success">Verificado</span>{:else}<span class="badge badge-warning">Pendiente</span>{/if}</p>
    </div>

    {#snippet qrLabel()}
      <QrCode size={14} /> QR de cobro
    {/snippet}

    <Section labelSnippet={qrLabel}>
      <PillButton label="Generar QR" onClick={handleGenerateQR} fullWidth />
      {#if qrImage}
        <img src={qrImage} alt="QR" class="qr-image" />
      {/if}
    </Section>

    {#snippet payLabel()}
      <Store size={14} /> Pagar en este comercio
    {/snippet}

    <Section labelSnippet={payLabel}>
      <div class="form">
        <TextField label="Tu billetera" bind:value={payWalletId} placeholder="ID de tu wallet" />
        <AmountField label="Monto" bind:value={payAmount} />
        <PillButton label="Pagar" onClick={handlePay} loading={paying} fullWidth />
        {#if payResult}<div class="msg success">{payResult}</div>{/if}
      </div>
    </Section>
  {/if}
</PageLayout>

<style>

  .merchant-hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
  .merchant-hero-icon { width: 56px; height: 56px; border-radius: var(--radius-2xl); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
  .merchant-hero h2 { font-size: var(--text-lg); font-weight: 700; margin: 0; color: rgba(var(--text-primary-rgb), 1); }
  .merchant-hero p { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .sep { margin: 0 var(--space-2); }
  .badge { font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 500; }
  .badge-success { background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); }
  .badge-warning { background: rgba(var(--warning-rgb), 0.15); color: rgba(var(--warning-rgb), 1); }
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .qr-image { width: 200px; height: 200px; display: block; margin: var(--space-4) auto 0; }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
</style>
