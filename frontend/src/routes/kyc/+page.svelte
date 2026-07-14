<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import api from '$lib/api';
  import { ArrowLeft, ShieldCheck, Shield, ShieldX } from '@lucide/svelte';

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
    none: { icon: ShieldX, color: 'var(--error-color)', label: 'Sin verificar', limit: 'Sin operaciones' },
    basic: { icon: Shield, color: 'var(--warning-color)', label: 'Datos básicos', limit: 'Límites restringidos' },
    verified: { icon: ShieldCheck, color: 'var(--success-color)', label: 'Verificado', limit: 'Hasta Bs. 10,000/día' },
    premium: { icon: ShieldCheck, color: 'var(--primary-color)', label: 'Premium', limit: 'Hasta Bs. 50,000/día' },
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

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Verificación KYC</h1>
</div>

<div class="page-content">
  {#if loading}
    <p style="text-align:center;padding:var(--space-8);color:var(--text-secondary);font-size:var(--text-sm)">Cargando...</p>
  {:else}
    <div class="section-card" style="margin-bottom:var(--space-4)">
      {#each Object.entries(levelInfo) as [level, info]}
        <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:{kycLevel === level ? 'none' : '1px solid var(--border)'};opacity:{kycLevel === level ? 1 : 0.5}">
          <svelte:component this={info.icon} size={20} color={kycLevel === level ? info.color : 'var(--text-secondary)'} />
          <div style="flex:1">
            <strong style="display:block;font-size:var(--text-sm)">{info.label}</strong>
            <p style="margin:0;font-size:var(--text-xs);color:var(--text-secondary)">{info.limit}</p>
          </div>
          {#if kycLevel === level}
            <span style="width:24px;height:24px;background:var(--success-color);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:700">&#10003;</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if kycLevel === 'none' && !showingForm}
      <Button onclick={() => showingForm = true} fullWidth>Iniciar verificación</Button>
    {/if}

    {#if showingForm}
      <div class="section-card">
        <h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Datos personales</h4>
        <div class="form-group">
          <Input id="fn" label="Nombre completo" bind:value={fullName} placeholder="Tu nombre" />
          <Select id="dt" label="Tipo de documento" options={docTypes} bind:value={documentType} />
          <Input id="dn" label="Número de documento" bind:value={documentNumber} placeholder="1234567" />
          <Input id="bd" label="Fecha de nacimiento" type="date" bind:value={birthDate} />
          <Input id="nat" label="Nacionalidad" bind:value={nationality} placeholder="Boliviana" />
          <Input id="addr" label="Dirección" bind:value={address} placeholder="Tu dirección" />
          {#if error}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>{/if}
          {#if success}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{success}</div>{/if}
          <Button onclick={handleSubmit} loading={submitting} fullWidth>Enviar KYC</Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
