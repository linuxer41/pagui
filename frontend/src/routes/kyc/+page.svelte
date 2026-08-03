<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import { ShieldCheck, Shield, ShieldX, Camera } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';

  let kycLevel = 'none';
  let loading = true;
  let showingForm = false;
  let fullName = ''; let documentType = 'ci'; let documentNumber = '';
  let birthDate = ''; let nationality = ''; let address = '';
  let selfieBase64 = ''; let frontBase64 = ''; let backBase64 = '';
  let selfiePreview: string | null = null;
  let frontPreview: string | null = null;
  let backPreview: string | null = null;
  let submitting = false; let error = ''; let success = '';

  let selfieInput: HTMLInputElement | undefined;
  let frontInput: HTMLInputElement | undefined;
  let backInput: HTMLInputElement | undefined;

  const docTypes = [
    { value: 'ci', label: 'Cédula de Identidad' },
    { value: 'passport', label: 'Pasaporte' },
    { value: 'nit', label: 'NIT' },
  ];

  const levelInfo: Record<string, { icon: any; label: string; limit: string }> = {
    none: { icon: ShieldX, label: 'Sin verificar', limit: 'Sin operaciones' },
    basic: { icon: Shield, label: 'Datos básicos', limit: 'Límites restringidos' },
    verified: { icon: ShieldCheck, label: 'Verificado', limit: 'Hasta Bs. 10,000/día' },
    premium: { icon: ShieldCheck, label: 'Premium', limit: 'Hasta Bs. 50,000/día' },
  };

  onMount(async () => {
    try {
      const res = await api.getKYCStatus();
      if (res && res.success !== false) kycLevel = res.data?.level || 'none';
    } catch {}
    finally { loading = false; }
  });

  async function fileToBase64(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function handlePhoto(
    event: Event,
    setBase64: (b: string) => void,
    setPreview: (p: string | null) => void,
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      setBase64(dataUrl.split(',')[1]);
      setPreview(dataUrl);
    } catch (e: any) {
      error = e.message || 'Error al procesar la imagen';
    }
  }

  async function handleSubmit() {
    if (!fullName || !documentNumber || !birthDate || !nationality || !address) {
      error = 'Complete todos los campos'; return;
    }
    if (!selfieBase64 || !frontBase64) {
      error = 'Adjunta tu selfie y el anverso del documento'; return;
    }
    submitting = true; error = ''; success = '';
    try {
      const res = await api.submitKYC({
        fullName, documentType: documentType as any, documentNumber, birthDate, nationality, address,
        selfieBase64,
        documentFrontBase64: frontBase64,
        documentBackBase64: backBase64 || undefined,
      });
      if (res.success) {
        const level = (res.data as any)?.level || 'basic';
        kycLevel = level;
        showingForm = false;
        success = level === 'verified'
          ? '¡Verificación completada! Tu identidad fue confirmada.'
          : 'KYC enviado. Espere verificación.';
      }
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { submitting = false; }
  }
</script>

<PageLayout title="KYC / Verificación">

  {#if loading}
    <Skeleton width="100%" height="120px" radius="lg" count={2} gap="space-3" />
  {:else}
    <div class="levels-section">
      {#each Object.entries(levelInfo) as [level, info]}
        <div class="kyc-level" class:active={kycLevel === level}>
          <div class="kyc-level-icon" class:active={kycLevel === level}>
            <svelte:component this={info.icon} size={20} />
          </div>
          <div class="kyc-level-info">
            <strong>{info.label}</strong>
            <p>{info.limit}</p>
          </div>
          {#if kycLevel === level}
            <div class="check-badge">✓</div>
          {/if}
        </div>
      {/each}
    </div>

    {#if kycLevel === 'none' && !showingForm}
      <PillButton label="Iniciar verificación" onClick={() => showingForm = true} fullWidth />
    {/if}

    {#if showingForm}
      <Section label="Fotos de verificación">
        <div class="photo-grid">
          <button type="button" class="photo-tile" class:filled={!!selfiePreview} onclick={() => selfieInput?.click()}>
            {#if selfiePreview}<img src={selfiePreview} alt="Selfie" />{:else}<div class="photo-placeholder"><Camera size={22} /><span>Selfie</span></div>{/if}
          </button>
          <button type="button" class="photo-tile" class:filled={!!frontPreview} onclick={() => frontInput?.click()}>
            {#if frontPreview}<img src={frontPreview} alt="Anverso del documento" />{:else}<div class="photo-placeholder"><Camera size={22} /><span>Anverso</span></div>{/if}
          </button>
          <button type="button" class="photo-tile" class:filled={!!backPreview} onclick={() => backInput?.click()}>
            {#if backPreview}<img src={backPreview} alt="Reverso del documento" />{:else}<div class="photo-placeholder"><Camera size={22} /><span>Reverso</span></div>{/if}
          </button>
        </div>
        <p class="hint">Se comparará tu selfie con el anverso del documento. El OCR completará automáticamente el nombre y número del carnet.</p>
      </Section>

      <Section label="Datos personales">
        <div class="form">
          <TextField label="Nombre completo" bind:value={fullName} placeholder="Tu nombre" />
          <div class="select-group">
            <span class="field-label">Tipo de documento</span>
            <select class="native-select" bind:value={documentType}>
              {#each docTypes as dt}<option value={dt.value}>{dt.label}</option>{/each}
            </select>
          </div>
          <TextField label="Número de documento" bind:value={documentNumber} placeholder="1234567" />
          <TextField label="Fecha de nacimiento" type="date" bind:value={birthDate} />
          <TextField label="Nacionalidad" bind:value={nationality} placeholder="Boliviana" />
          <TextField label="Dirección" bind:value={address} placeholder="Tu dirección" />
          {#if error}<div class="msg error">{error}</div>{/if}
          {#if success}<div class="msg success">{success}</div>{/if}
          <PillButton label="Enviar KYC" onClick={handleSubmit} loading={submitting} fullWidth />
        </div>
      </Section>
    {/if}
  {/if}
</PageLayout>

<input type="file" bind:this={selfieInput} accept="image/*" capture="user" onchange={(e) => handlePhoto(e, (b) => selfieBase64 = b, (p) => selfiePreview = p)} style="display:none" />
<input type="file" bind:this={frontInput} accept="image/*" capture="environment" onchange={(e) => handlePhoto(e, (b) => frontBase64 = b, (p) => frontPreview = p)} style="display:none" />
<input type="file" bind:this={backInput} accept="image/*" capture="environment" onchange={(e) => handlePhoto(e, (b) => backBase64 = b, (p) => backPreview = p)} style="display:none" />

<style>

  .levels-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .kyc-level { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-lg); opacity: 0.4; transition: opacity var(--duration-fast); }
  .kyc-level.active { opacity: 1; background: rgba(var(--surface-rgb), 1); }
  .kyc-level-icon { flex-shrink: 0; color: rgba(var(--text-tertiary-rgb), 0.5); }
  .kyc-level-icon.active { color: var(--primary); }
  .kyc-level-info { flex: 1; }
  .kyc-level-info strong { display: block; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); }
  .kyc-level-info p { margin: 0; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .check-badge { width: 24px; height: 24px; background: var(--primary); color: rgba(var(--bg-rgb), 1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700; flex-shrink: 0; }
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
  .photo-tile { aspect-ratio: 3/4; border-radius: var(--radius-lg); border: 1.5px dashed rgba(var(--border-rgb), 0.6); background: rgba(var(--surface-rgb), 0.5); overflow: hidden; cursor: pointer; padding: 0; position: relative; }
  .photo-tile:active { opacity: 0.8; }
  .photo-tile.filled { border-style: solid; border-color: rgba(var(--primary-rgb), 0.6); }
  .photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); color: rgba(var(--text-tertiary-rgb), 1); font-size: var(--text-xs); font-weight: 500; }
  .hint { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); margin: var(--space-2) 0 0; }
  .select-group { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: rgba(var(--text-secondary-rgb), 1); }
  .native-select { width: 100%; padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); height: 44px; outline: none; }
  .native-select:focus { border-color: rgba(var(--primary-rgb), 0.6); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }
  .msg.error { background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .msg.success { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
</style>
