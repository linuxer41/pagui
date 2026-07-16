<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { User, Loader, RefreshCw } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import EmailField from '$lib/components/ui/EmailField.svelte';
  import { toasts } from '$lib/stores/toast';

  let email = '';
  let loading = false;
  let error = '';
  let resetEmailSent = false;

  async function handleForgotPassword(e: Event) {
    e.preventDefault();
    if (!email) { error = 'Por favor ingrese su correo electrónico'; return; }
    error = ''; loading = true;
    try {
      await api.requestPasswordReset(email);
      resetEmailSent = true;
      toasts.show('Se han enviado instrucciones a su correo electrónico', 'success');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally { loading = false; }
  }
</script>

<div class="page">
  <div class="form-wrap">
    <form onsubmit={handleForgotPassword}>
      <EmailField label="Email" bind:value={email} disabled={loading || resetEmailSent} placeholder="Ingresa tu email" />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if resetEmailSent}
        <div class="msg success">Revisa tu bandeja de entrada para obtener instrucciones sobre cómo restablecer tu contraseña.</div>
      {/if}
      <PillButton type="submit" label={loading ? 'Enviando...' : 'Enviar instrucciones'} loading={loading} disabled={resetEmailSent} fullWidth />
      <div class="form-footer">
        <button type="button" class="text-link" onclick={() => goto('/auth/login')}>Volver al inicio de sesión</button>
      </div>
    </form>
  </div>
</div>

<style>
  .page { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); max-width: 400px; margin: 0 auto; width: 100%; }
  .form-wrap { display: flex; flex-direction: column; gap: var(--space-4); }
  form { display: flex; flex-direction: column; gap: var(--space-4); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }
  .msg.error { background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .msg.success { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
  .form-footer { display: flex; justify-content: center; }
  .text-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: var(--text-sm); font-weight: 500; padding: var(--space-2); }
</style>
