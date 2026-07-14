<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
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

<RouteLayout title={merchant?.business_name || 'Comercio'}>
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if merchant}
    <div class="header-card">
      <Store size={32} />
      <h2>{merchant.business_name}</h2>
      <p>{merchant.business_category} • {merchant.is_verified ? '✅ Verificado' : '⏳ Pendiente'}</p>
    </div>

    <div class="section">
      <h3>QR de cobro</h3>
      <Button on:click={handleGenerateQR}><QrCode size={16} /> Generar QR</Button>
      {#if qrImage}
        <img src={qrImage} alt="QR" class="qr" />
      {/if}
    </div>

    <div class="section">
      <h3>Pagar en este comercio</h3>
      <Input id="wallet" label="Tu billetera" bind:value={payWalletId} placeholder="ID de tu wallet" />
      <Input id="pamount" label="Monto" type="number" bind:value={payAmount} placeholder="0.00" />
      <Button on:click={handlePay} loading={paying} fullWidth>Pagar</Button>
      {#if payResult}<div class="msg">{payResult}</div>{/if}
    </div>
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .header-card { text-align: center; padding: 1.5rem; background: var(--surface); border-radius: 12px; margin-bottom: 1rem; border: 1px solid var(--border); }
  .header-card h2 { margin: 0.5rem 0 0.25rem; }
  .header-card p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
  .section { background: var(--surface); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); }
  .section h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .qr { width: 200px; height: 200px; display: block; margin: 1rem auto; }
  .msg { margin-top: 0.5rem; padding: 0.5rem; border-radius: 8px; background: #e8f5e9; color: #2e7d32; }
</style>
