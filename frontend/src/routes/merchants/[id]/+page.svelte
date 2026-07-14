<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { Store, QrCode } from '@lucide/svelte';

  let merchant: any = null;
  let qrImage = '';
  let loading = true;
  let payAmount = 0;
  let payWalletId = '';
  let payResult = '';
  let paying = false;

  onMount(async () => {
    try {
      const res = await api.get(`/merchants/${$page.params.id}`);
      if (res.success) merchant = res.data;
    } catch {}
    finally { loading = false; }
  });

  async function handleGenerateQR() {
    try {
      const res = await api.getMerchantQR($page.params.id);
      if (res.success) qrImage = res.data.qrImage;
    } catch {}
  }

  async function handlePay() {
    if (!payWalletId || payAmount <= 0) return;
    paying = true;
    try {
      const res = await api.merchantPay({ merchantId: $page.params.id, customerWalletId: payWalletId, amount: payAmount });
      if (res.success) payResult = 'Pago exitoso';
      else payResult = res.message || 'Error';
    } catch (e: any) { payResult = e.message; }
    finally { paying = false; }
  }
</script>

<div class="page-header">
  <span class="page-header-title">{merchant?.business_name || 'Comercio'}</span>
</div>

<div class="page-content" style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
  {#if loading}
    <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Cargando...</div>
  {:else if merchant}
    <div class="section-card" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-3)">
      <div style="width:56px;height:56px;border-radius:var(--radius-2xl);background:var(--primary-subtle);color:var(--primary-color);display:flex;align-items:center;justify-content:center">
        <Store size={28} />
      </div>
      <h2 style="font-size:var(--text-lg);font-weight:700;margin:0;color:var(--text-primary)">{merchant.business_name}</h2>
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0">{merchant.business_category} <span style="margin:0 var(--space-2)">•</span> {#if merchant.is_verified}<span class="badge-success">Verificado</span>{:else}<span class="badge-warning">Pendiente</span>{/if}</p>
    </div>

    <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary)">QR de cobro</div>
      <Button onclick={handleGenerateQR}><QrCode size={16} /> Generar QR</Button>
      {#if qrImage}
        <img src={qrImage} alt="QR" style="width:200px;height:200px;display:block;margin:0 auto" />
      {/if}
    </div>

    <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary)">Pagar en este comercio</div>
      <Input id="wallet" label="Tu billetera" bind:value={payWalletId} placeholder="ID de tu wallet" />
      <Input id="pamount" label="Monto" type="number" bind:value={payAmount} placeholder="0.00" />
      <Button onclick={handlePay} loading={paying} fullWidth>Pagar</Button>
      {#if payResult}
        <div style="padding:0.75rem;border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{payResult}</div>
      {/if}
    </div>
  {/if}
</div>
