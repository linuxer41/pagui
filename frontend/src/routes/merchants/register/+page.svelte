<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { ArrowLeft } from '@lucide/svelte';

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

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Registrar comercio</h1>
</div>

<div class="page-content">
  <div class="section-card">
    <div class="form-group">
      <Input id="name" label="Nombre comercial *" bind:value={businessName} placeholder="Ej: Tienda Doña María" />
      <Input id="cat" label="Categoría" bind:value={businessCategory} placeholder="Ej: Alimentos, Ropa, etc" />
      <Input id="tax" label="NIT *" bind:value={taxId} placeholder="Número de identificación tributaria" />
      <Input id="phone" label="Teléfono *" bind:value={phone} placeholder="+591 7XXXXXXX" />
      <Input id="addr" label="Dirección" bind:value={address} placeholder="Dirección del comercio" />
      <Input id="rate" label="Comisión (%)" type="number" bind:value={commissionRate} placeholder="0.5" />
      {#if error}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>{/if}
      {#if success}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{success}</div>{/if}
      <Button onclick={handleRegister} loading={loading} fullWidth>Registrar comercio</Button>
    </div>
  </div>
</div>
