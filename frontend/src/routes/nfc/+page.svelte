<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';
  import { Nfc } from '@lucide/svelte';

  let senderWalletId = ''; let receiverWalletId = '';
  let amount = 0; let nfcPayload: any = null;
  let loading = false; let error = ''; let success = '';

  async function handlePrepare() {
    if (!senderWalletId || !receiverWalletId || amount <= 0) { error = 'Complete todos los campos'; return; }
    loading = true; error = '';
    try {
      const res = await api.prepareNFC({ senderWalletId, receiverWalletId, amount });
      if (res.success) { nfcPayload = res.data; success = 'Pago NFC preparado. Acérquese al receptor.'; }
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }

  async function handleProcess() {
    if (!nfcPayload) return;
    loading = true;
    try {
      const res = await api.processNFC(nfcPayload.payload);
      if (res.success) success = '✅ Pago NFC completado';
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<RouteLayout title="Pago NFC">
  <div class="hero">
    <Nfc size={48} />
    <p>Pago sin contacto offline</p>
  </div>

  <div class="form">
    <Input id="s" label="Tu billetera" bind:value={senderWalletId} placeholder="Wallet ID origen" />
    <Input id="r" label="Billetera destino" bind:value={receiverWalletId} placeholder="Wallet ID destino" />
    <Input id="a" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
    {#if error}<div class="msg error">{error}</div>{/if}
    {#if success}<div class="msg success">{success}</div>{/if}

    {#if !nfcPayload}
      <Button on:click={handlePrepare} loading={loading} fullWidth>Preparar pago NFC</Button>
    {:else}
      <div class="payload">
        <p><strong>ID NFC:</strong> {nfcPayload.payload.nfcId.slice(0, 16)}...</p>
        <p><strong>Monto:</strong> Bs. {nfcPayload.payload.amount}</p>
        <p><strong>Firma:</strong> {nfcPayload.payload.signature.slice(0, 16)}...</p>
      </div>
      <Button on:click={handleProcess} loading={loading} fullWidth variant="secondary">
        Procesar pago offline
      </Button>
    {/if}
  </div>
</RouteLayout>

<style>
  .hero { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem 1rem; color: var(--primary); }
  .hero p { color: var(--text-secondary); font-size: 0.9rem; }
  .form { display: flex; flex-direction: column; gap: 1rem; }
  .msg { padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
  .msg.error { background: #ffebee; color: #c62828; }
  .msg.success { background: #e8f5e9; color: #2e7d32; }
  .payload { background: var(--surface); border-radius: 10px; padding: 1rem; border: 1px solid var(--border); }
  .payload p { margin: 0.25rem 0; font-size: 0.85rem; }
</style>
