<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';

  let businessName = ''; let businessCategory = ''; let taxId = '';
  let phone = ''; let address = ''; let commissionRate = 0.5;
  let loading = false; let error = ''; let success = '';

  async function handleRegister() {
    if (!businessName || !taxId || !phone) { error = 'Complete los campos obligatorios'; return; }
    loading = true; error = '';
    try {
      const res = await api.registerMerchant({ businessName, businessCategory, taxId, phone, address: address || undefined, commissionRate });
      if (res.success) { success = 'Comercio registrado exitosamente'; setTimeout(() => goto('/merchants'), 1500); }
      else { error = res.message || 'Error'; }
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<RouteLayout title="Registrar comercio">
  <div class="form">
    <Input id="name" label="Nombre comercial *" bind:value={businessName} placeholder="Ej: Tienda Doña María" />
    <Input id="cat" label="Categoría" bind:value={businessCategory} placeholder="Ej: Alimentos, Ropa, etc" />
    <Input id="tax" label="NIT *" bind:value={taxId} placeholder="Número de identificación tributaria" />
    <Input id="phone" label="Teléfono *" bind:value={phone} placeholder="+591 7XXXXXXX" />
    <Input id="addr" label="Dirección" bind:value={address} placeholder="Dirección del comercio" />
    <Input id="rate" label="Comisión (%)" type="number" bind:value={commissionRate} placeholder="0.5" />
    {#if error}<div class="msg error">{error}</div>{/if}
    {#if success}<div class="msg success">{success}</div>{/if}
    <Button on:click={handleRegister} loading={loading} fullWidth>Registrar comercio</Button>
  </div>
</RouteLayout>

<style>
  .form { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
  .msg { padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
  .msg.error { background: #ffebee; color: #c62828; }
  .msg.success { background: #e8f5e9; color: #2e7d32; }
</style>
