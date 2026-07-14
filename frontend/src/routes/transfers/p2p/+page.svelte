<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';

  let walletId = '';
  let receiverWalletId = '';
  let amount = 0;
  let description = '';
  let loading = false;
  let error = '';
  let success = '';

  async function handleTransfer() {
    if (!receiverWalletId || amount <= 0) { error = 'Complete todos los campos'; return; }
    loading = true; error = ''; success = '';
    try {
      const res = await api.transferP2P({ receiverWalletId, amount, description: description || undefined },
        crypto.randomUUID().slice(0, 32));
      if (res.success) { success = 'Transferencia exitosa'; amount = 0; description = ''; }
      else { error = res.message || 'Error al transferir'; }
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<div class="page-header">
  <button class="page-header-back" onclick={() => goto('/transfers')}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <span class="page-header-title">Nueva transferencia</span>
</div>
<div class="page-content section-card" style="display:flex;flex-direction:column;gap:1.25rem;margin-top:var(--space-4)">
  <Input id="receiver" label="Billetera destino" type="text" bind:value={receiverWalletId}
    placeholder="ID de la billetera receptora" />
  <Input id="amount" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
  <Input id="desc" label="Descripción (opcional)" type="text" bind:value={description} placeholder="¿Para qué es?" />
  {#if error}
    <div style="padding:0.75rem;border-radius:var(--radius-lg);font-size:0.9rem;background:var(--error-bg);color:var(--error-color)">{error}</div>
  {/if}
  {#if success}
    <div style="padding:0.75rem;border-radius:var(--radius-lg);font-size:0.9rem;background:var(--success-bg);color:var(--success-color)">{success}</div>
  {/if}
  <Button onclick={handleTransfer} loading={loading} fullWidth>
    {loading ? 'Procesando...' : 'Enviar transferencia'}
  </Button>
</div>
