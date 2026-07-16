<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { CheckCircle2, AlertCircle } from '@lucide/svelte'
  import PageHeader from '$lib/components/PageHeader.svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'
  import EmailField from '$lib/components/ui/EmailField.svelte'
  import PhoneField from '$lib/components/ui/PhoneField.svelte'

  let fullName = ''
  let email = ''
  let company = ''
  let phone = ''
  let message = ''
  let isSubmitting = false
  let submitSuccess = false
  let submitError = false
  let errorMessage = ''

  function validateForm(): boolean {
    if (!fullName || !email || !company || !phone || !message) {
      errorMessage = 'Por favor completa todos los campos.'
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errorMessage = 'Correo electrónico inválido.'
      return false
    }
    return true
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    submitError = false
    errorMessage = ''
    if (!validateForm()) { submitError = true; return }
    isSubmitting = true
    try {
      const res = await api.register({ fullName, email, company, phone, message })
      if (res.success) {
        submitSuccess = true
        fullName = ''; email = ''; company = ''; phone = ''; message = ''
      } else {
        throw new Error(res.message || 'Error al enviar solicitud')
      }
    } catch (err: any) {
      submitError = true
      errorMessage = err.message || 'Error de conexión. Intenta nuevamente.'
    } finally {
      isSubmitting = false
    }
  }
</script>

<div class="register">
  <PageHeader title="Crear cuenta" />

  {#if submitSuccess}
    <div class="success-body">
      <div class="success-icon">
        <CheckCircle2 size={48} />
      </div>
      <h2 class="success-title">Solicitud enviada</h2>
      <p class="success-desc">Te contactaremos pronto para activar tu cuenta.</p>
      <PillButton label="Volver al inicio" onClick={() => goto('/auth/login')} fullWidth />
    </div>
  {:else}
    {#if submitError}
      <div class="error-msg">
        <AlertCircle size={16} />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <form class="register-form" onsubmit={handleSubmit}>
      <TextField label="Nombre completo" bind:value={fullName} placeholder="Tu nombre" />
      <EmailField bind:value={email} />
      <TextField label="Empresa" bind:value={company} placeholder="Nombre de tu empresa" />
      <PhoneField bind:value={phone} />
      <div class="field">
        <span class="field-label">Mensaje</span>
        <div class="field-wrap">
          <textarea bind:value={message} placeholder="Cuéntanos sobre tu negocio..." class="field-textarea" required></textarea>
        </div>
      </div>
      <div style="margin-top: var(--space-2);">
      <PillButton type="submit" label={isSubmitting ? 'Enviando...' : 'Enviar solicitud'} loading={isSubmitting} fullWidth />
      </div>
    </form>
  {/if}
</div>

<style>
  .register {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-height: 100dvh;
  }

  .error-msg {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: rgba(var(--error-rgb), 0.1);
    color: rgba(var(--error-rgb), 1);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); font-weight: 500;
    margin: 0 var(--space-4);
  }
  .register-form {
    display: flex; flex-direction: column; gap: var(--space-4);
    padding: var(--space-4);
  }
  .field {
    display: flex; flex-direction: column; gap: var(--space-1);
  }
  .field-label {
    font-size: var(--text-xs); font-weight: 600;
    color: rgba(var(--text-tertiary-rgb), 1);
    letter-spacing: 0.5px;
  }
  .field-wrap {
    border-bottom: 1.5px solid rgba(var(--border-rgb), 1);
    padding: var(--space-2) 0;
    transition: border-color var(--duration-fast);
  }
  .field-wrap:focus-within { border-color: var(--primary); }
  .field-textarea {
    width: 100%;
    border: none; background: transparent;
    font-size: var(--text-base);
    color: rgba(var(--text-primary-rgb), 1);
    outline: none;
    min-height: 80px;
    resize: vertical;
    font-family: inherit;
  }
  .field-textarea::placeholder { color: rgba(var(--text-tertiary-rgb), 0.5); }
  .success-body {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4); gap: var(--space-3);
  }
  .success-icon {
    width: 80px; height: 80px; border-radius: var(--radius-full);
    background: rgba(var(--success-rgb), 0.15);
    color: rgba(var(--success-rgb), 1);
    display: flex; align-items: center; justify-content: center;
  }
  .success-title {
    font-size: var(--text-xl); font-weight: 700;
    color: rgba(var(--text-primary-rgb), 1); margin: 0;
  }
  .success-desc {
    font-size: var(--text-sm);
    color: rgba(var(--text-secondary-rgb), 1);
    margin: 0 0 var(--space-4);
  }
</style>
