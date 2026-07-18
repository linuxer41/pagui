<script lang="ts">
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { onMount } from 'svelte'
  import { Nfc } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';
  import WalletTabs from '$lib/components/composite/WalletTabs.svelte';
  import { isAvailable, scan, textRecord } from '@tauri-apps/plugin-nfc'

  import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'

  let wallets: any[] = []
  let senderWallet: any = null; let receiverWalletId = '';
  let amount = 0; let nfcPayload: any = null;
  let loading = false; let error = ''; let success = '';
  let nfcAvailable = false;

  onMount(async () => {
    try {
      const res = await api.getWallets()
      if (res.success && res.data?.length) {
        wallets = res.data
        senderWallet = wallets[0]
      }
    } catch {}
  })

  async function checkNfc() {
    try {
      nfcAvailable = await isAvailable()
    } catch {
      nfcAvailable = false
    }
  }

  async function ensureNotificationPerm() {
    try {
      const granted = await isPermissionGranted()
      if (!granted) {
        await requestPermission()
      }
    } catch {}
  }

  async function handlePrepare() {
    if (!senderWallet?.id || !receiverWalletId || amount <= 0) { error = 'Complete todos los campos'; return; }
    loading = true; error = '';
    try {
      const res: any = await api.prepareNFC({ senderWalletId: senderWallet.id, receiverWalletId, amount });
      if (res.success) { nfcPayload = res.data; success = 'Pago NFC preparado. Acérquese al receptor.'; }
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }

  async function handleProcess() {
    if (!nfcPayload) return;
    loading = true;
    try {
      if (nfcAvailable) {
        const record = textRecord(`pagui:nfc:${nfcPayload.payload.nfcId}`)
        await scan({ type: 'ndef' })
        const res: any = await api.processNFC(nfcPayload.payload);
        if (res.success) {
          success = 'Pago NFC completado';
          await ensureNotificationPerm()
          sendNotification({ title: 'Pago NFC', body: `Pago de Bs. ${nfcPayload.payload.amount} completado` })
        }
        else error = res.message || 'Error';
      } else {
        const res: any = await api.processNFC(nfcPayload.payload);
        if (res.success) success = 'Pago NFC completado';
        else error = res.message || 'Error';
      }
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<PageLayout title="NFC">

  <div class="nfc-hero">
    <Nfc size={48} />
    <p>Pago sin contacto offline</p>
  </div>

  <div class="form">
    <label class="field-label">Tu billetera</label>
    <WalletTabs {wallets} selected={senderWallet} onSelect={(w) => senderWallet = w} />
    <TextField label="Billetera destino" bind:value={receiverWalletId} placeholder="Wallet ID destino" />
    <AmountField label="Monto" bind:value={amount} />
    {#if error}<div class="msg error">{error}</div>{/if}
    {#if success}<div class="msg success">{success}</div>{/if}

    {#if !nfcPayload}
      <PillButton label="Preparar pago NFC" onClick={handlePrepare} {loading} fullWidth />
    {:else}
      <div class="nfc-payload">
        <p><strong>ID NFC:</strong> {nfcPayload.payload.nfcId.slice(0, 16)}...</p>
        <p><strong>Monto:</strong> Bs. {nfcPayload.payload.amount}</p>
        <p><strong>Firma:</strong> {nfcPayload.payload.signature.slice(0, 16)}...</p>
      </div>
      <PillButton label="Procesar pago offline" onClick={handleProcess} {loading} fullWidth />
    {/if}
  </div>
</PageLayout>

<style>

  .nfc-hero { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-8) var(--space-4); color: var(--primary); }
  .nfc-hero p { color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); }
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }
  .msg.error { background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .msg.success { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
  .nfc-payload { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .nfc-payload p { margin: var(--space-1) 0; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
</style>
