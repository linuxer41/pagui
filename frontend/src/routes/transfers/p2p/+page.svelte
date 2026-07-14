<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
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

<RouteLayout title="Nueva transferencia">
  <div class="form">
    <Input id="receiver" label="Billetera destino" type="text" bind:value={receiverWalletId}
      placeholder="ID de la billetera receptora" />
    <Input id="amount" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
    <Input id="desc" label="Descripción (opcional)" type="text" bind:value={description} placeholder="¿Para qué es?" />
    {#if error}<div class="msg error">{error}</div>{/if}
    {#if success}<div class="msg success">{success}</div>{/if}
    <Button on:click={handleTransfer} loading={loading} fullWidth>
      {loading ? 'Procesando...' : 'Enviar transferencia'}
    </Button>
  </div>
</RouteLayout>

<style>
  .form { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
  .msg { padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
  .msg.error { background: #ffebee; color: #c62828; }
  .msg.success { background: #e8f5e9; color: #2e7d32; }
</style>
