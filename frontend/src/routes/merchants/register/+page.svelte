<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { Store } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import PhoneField from '$lib/components/ui/PhoneField.svelte';

  let businessName = ''; let businessCategory = ''; let taxId = '';
  let phone = ''; let address = ''; let commissionRateStr = '0.5';
  let loading = false; let error = ''; let success = '';

  async function handleRegister() {
    if (!businessName || !taxId || !phone) { error = 'Complete los campos obligatorios'; return; }
    loading = true; error = '';
    try {
      const res = await api.registerMerchant({ businessName, businessCategory, taxId, phone, address: address || undefined, commissionRate: parseFloat(commissionRateStr) || 0.5 });
      if (res.success) { success = 'Comercio registrado exitosamente'; setTimeout(() => goto('/merchants'), 1500); }
      else { error = res.message || 'Error'; }
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

{#snippet sectionLabel()}
  <Store size={14} /> Información del comercio
{/snippet}

<PageLayout title="Registrar comercio">

  <Section labelSnippet={sectionLabel}>
    <div class="form">
      <TextField label="Nombre comercial *" bind:value={businessName} placeholder="Ej: Tienda Doña María" />
      <TextField label="Categoría" bind:value={businessCategory} placeholder="Ej: Alimentos, Ropa, etc" />
      <TextField label="NIT *" bind:value={taxId} placeholder="Número de identificación tributaria" />
      <PhoneField label="Teléfono *" bind:value={phone} />
      <TextField label="Dirección" bind:value={address} placeholder="Dirección del comercio" />
      <TextField label="Comisión (%)" type="number" bind:value={commissionRateStr} placeholder="0.5" />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if success}<div class="msg success">{success}</div>{/if}
      <PillButton label="Registrar comercio" onClick={handleRegister} {loading} fullWidth />
    </div>
  </Section>
</PageLayout>

<style>
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }
  .msg.error { background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .msg.success { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
</style>
