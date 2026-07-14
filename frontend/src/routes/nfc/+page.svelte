<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { ArrowLeft, Nfc } from '@lucide/svelte';

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
      if (res.success) success = 'Pago NFC completado';
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Pago NFC</h1>
</div>

<div class="page-content">
  <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-8) var(--space-4);color:var(--primary-color)">
    <Nfc size={48} />
    <p style="color:var(--text-secondary);font-size:var(--text-sm)">Pago sin contacto offline</p>
  </div>

  <div class="section-card">
    <div class="form-group">
      <Input id="s" label="Tu billetera" bind:value={senderWalletId} placeholder="Wallet ID origen" />
      <Input id="r" label="Billetera destino" bind:value={receiverWalletId} placeholder="Wallet ID destino" />
      <Input id="a" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
      {#if error}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>{/if}
      {#if success}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{success}</div>{/if}

      {#if !nfcPayload}
        <Button onclick={handlePrepare} loading={loading} fullWidth>Preparar pago NFC</Button>
      {:else}
        <div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-4);border:1px solid var(--border)">
          <p style="margin:var(--space-1) 0;font-size:var(--text-sm)"><strong>ID NFC:</strong> {nfcPayload.payload.nfcId.slice(0, 16)}...</p>
          <p style="margin:var(--space-1) 0;font-size:var(--text-sm)"><strong>Monto:</strong> Bs. {nfcPayload.payload.amount}</p>
          <p style="margin:var(--space-1) 0;font-size:var(--text-sm)"><strong>Firma:</strong> {nfcPayload.payload.signature.slice(0, 16)}...</p>
        </div>
        <Button onclick={handleProcess} loading={loading} fullWidth variant="secondary">
          Procesar pago offline
        </Button>
      {/if}
    </div>
  </div>
</div>
