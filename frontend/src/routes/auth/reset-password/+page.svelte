<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { toasts } from '$lib/stores/toast';
  import { Key, Lock } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import PasswordField from '$lib/components/ui/PasswordField.svelte';

  let token = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let resetSuccess = false;

  onMount(() => {
    if ($auth.isAuthenticated) { goto('/'); return; }
    const url = new URL(window.location.href);
    token = url.searchParams.get('token') || '';
    if (!token) error = 'Token inválido o no proporcionado';
  });

  function validateForm(): boolean {
    if (!token) { error = 'Token inválido o no proporcionado'; return false; }
    if (!password) { error = 'Debe ingresar una contraseña'; return false; }
    if (password !== confirmPassword) { error = 'Las contraseñas no coinciden'; return false; }
    if (password.length < 8) { error = 'La contraseña debe tener al menos 8 caracteres'; return false; }
    return true;
  }

  async function handleResetPassword(e: Event) {
    e.preventDefault();
    error = '';
    if (!validateForm()) return;
    loading = true;
    try {
      const response = await api.resetPassword(token, password);
      if (response.success) { resetSuccess = true; toasts.show('Contraseña cambiada con éxito', 'success'); }
      else error = response.message || 'Error al restablecer la contraseña';
    } catch (err) { error = err instanceof Error ? err.message : 'Error de conexión.'; }
    finally { loading = false; }
  }
</script>

<div class="page">
  {#if resetSuccess}
    <div class="success-container">
      <h2>¡Contraseña actualizada!</h2>
      <p>Tu contraseña ha sido actualizada correctamente.</p>
      <PillButton label="Ir al inicio de sesión" onClick={() => goto('/auth/login')} fullWidth />
    </div>
  {:else}
    <div class="form-wrap">
      <form onsubmit={handleResetPassword}>
        <PasswordField label="Nueva contraseña" bind:value={password} placeholder="Ingresa tu nueva contraseña" disabled={loading || !token} />
        <PasswordField label="Confirmar contraseña" bind:value={confirmPassword} placeholder="Confirma tu nueva contraseña" disabled={loading || !token} />
        {#if error}<div class="msg error">{error}</div>{/if}
        <PillButton type="submit" label={loading ? 'Procesando...' : 'Restablecer contraseña'} loading={loading} disabled={!token} fullWidth />
        <div class="form-footer">
          <button type="button" class="text-link" onclick={() => goto('/auth/login')}>Volver al inicio de sesión</button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); max-width: 400px; margin: 0 auto; width: 100%; }
  .form-wrap { display: flex; flex-direction: column; gap: var(--space-4); }
  form { display: flex; flex-direction: column; gap: var(--space-4); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .form-footer { display: flex; justify-content: center; }
  .text-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: var(--text-sm); font-weight: 500; padding: var(--space-2); }
  .success-container { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-8); text-align: center; }
  .success-container h2 { font-size: 1.5rem; margin: 0; color: rgba(var(--text-primary-rgb), 1); font-weight: 700; }
  .success-container p { margin: 0; color: rgba(var(--text-secondary-rgb), 1); }
</style>
