<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';
  import { ShieldCheck, Shield, ShieldX } from '@lucide/svelte';

  let kycLevel = 'none';
  let loading = true;
  let showingForm = false;
  let fullName = ''; let documentType = 'ci'; let documentNumber = '';
  let birthDate = ''; let nationality = ''; let address = '';
  let submitting = false; let error = ''; let success = '';

  const docTypes = [
    { value: 'ci', label: 'Cédula de Identidad' },
    { value: 'passport', label: 'Pasaporte' },
    { value: 'nit', label: 'NIT' },
  ];

  const levelInfo: Record<string, { icon: any; color: string; label: string; limit: string }> = {
    none: { icon: ShieldX, color: '#ef5350', label: 'Sin verificar', limit: 'Sin operaciones' },
    basic: { icon: Shield, color: '#ff9800', label: 'Datos básicos', limit: 'Límites restringidos' },
    verified: { icon: ShieldCheck, color: '#4caf50', label: 'Verificado', limit: 'Hasta Bs. 10,000/día' },
    premium: { icon: ShieldCheck, color: '#2196f3', label: 'Premium', limit: 'Hasta Bs. 50,000/día' },
  };

  onMount(async () => {
    try {
      const res = await api.getKYCStatus();
      if (res.success) kycLevel = res.data.level || 'none';
    } catch {}
    finally { loading = false; }
  });

  async function handleSubmit() {
    if (!fullName || !documentNumber || !birthDate || !nationality || !address) {
      error = 'Complete todos los campos'; return;
    }
    submitting = true; error = ''; success = '';
    try {
      const res = await api.submitKYC({ fullName, documentType: documentType as any, documentNumber, birthDate, nationality, address });
      if (res.success) { kycLevel = 'basic'; showingForm = false; success = 'KYC enviado. Espere verificación.'; }
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { submitting = false; }
  }
</script>

<RouteLayout title="Verificación KYC">
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else}
    <div class="status-card" style="border-color: {levelInfo[kycLevel]?.color}">
      {#each Object.entries(levelInfo) as [level, info]}
        <div class="level-row" class:active={kycLevel === level}>
          <svelte:component this={info.icon} size={20} color={kycLevel === level ? info.color : 'var(--text-secondary)'} />
          <div class="level-info">
            <strong>{info.label}</strong>
            <p>{info.limit}</p>
          </div>
          {#if kycLevel === level}
            <span class="check">✓</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if kycLevel === 'none' && !showingForm}
      <Button on:click={() => showingForm = true} fullWidth>Iniciar verificación</Button>
    {/if}

    {#if showingForm}
      <div class="form">
        <h3>Datos personales</h3>
        <Input id="fn" label="Nombre completo" bind:value={fullName} placeholder="Tu nombre" />
        <Select id="dt" label="Tipo de documento" options={docTypes} bind:value={documentType} />
        <Input id="dn" label="Número de documento" bind:value={documentNumber} placeholder="1234567" />
        <Input id="bd" label="Fecha de nacimiento" type="date" bind:value={birthDate} />
        <Input id="nat" label="Nacionalidad" bind:value={nationality} placeholder="Boliviana" />
        <Input id="addr" label="Dirección" bind:value={address} placeholder="Tu dirección" />
        {#if error}<div class="msg error">{error}</div>{/if}
        {#if success}<div class="msg success">{success}</div>{/if}
        <Button on:click={handleSubmit} loading={submitting} fullWidth>Enviar KYC</Button>
      </div>
    {/if}
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .status-card { background: var(--surface); border-radius: 12px; padding: 1rem; border: 2px solid; margin-bottom: 1rem; }
  .level-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border); opacity: 0.5; }
  .level-row.active { opacity: 1; }
  .level-row:last-child { border: none; }
  .level-info { flex: 1; }
  .level-info strong { display: block; font-size: 0.9rem; }
  .level-info p { margin: 0; font-size: 0.78rem; color: var(--text-secondary); }
  .check { width: 24px; height: 24px; background: #4caf50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
  .form { background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); }
  .form h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .msg { padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
  .msg.error { background: #ffebee; color: #c62828; }
  .msg.success { background: #e8f5e9; color: #2e7d32; }
</style>
