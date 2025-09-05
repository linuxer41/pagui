<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { APP_CONFIG } from '$lib/config';
  import { User, Loader, RefreshCw } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { toasts } from '$lib/stores/toast';
  import { fly } from 'svelte/transition';
  import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';

  let email = '';
  let loading = false;
  let error = '';
  let resetEmailSent = false;

  async function handleForgotPassword() {
    if (!email) {
      error = 'Por favor ingrese su correo electrónico';
      return;
    }
    error = '';
    loading = true;
    try {
      await api.requestPasswordReset(email);
      resetEmailSent = true;
      toasts.show('Se han enviado instrucciones a su correo electrónico', 'success');
    } catch (err) {
      console.error('Error al solicitar restablecimiento:', err);
      error = err instanceof Error ? err.message : 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }

  function goToLogin() {
    goto('/auth/login');
  }
</script>

<AuthLayout>
  <span slot="subtitle">
    <p class="subtitle" in:fly={{ y: 16, duration: 400, delay: 120 }}>
      Recuperar contraseña
    </p>
  </span>
  <div class="login-form" in:fly={{ y: 24, duration: 400, delay: 300 }}>
    <form on:submit|preventDefault={handleForgotPassword} style="display: flex; flex-direction: column; gap: var(--spacing-md)">
      <Input
        id="email"
        label="Email"
        type="email"
        bind:value={email}
        required
        disabled={loading || resetEmailSent}
        placeholder="Ingresa tu email"
        icon={User}
      />
      {#if error}
        <div class="error-message message">
          {error}
        </div>
      {/if}
      {#if resetEmailSent}
        <div class="success-message message">
          Revisa tu bandeja de entrada para obtener instrucciones sobre cómo restablecer tu contraseña.
        </div>
      {/if}
      <Button 
        type="submit" 
        variant="primary" 
        fullWidth 
        loading={loading}
        disabled={resetEmailSent}
        icon={loading ? Loader : RefreshCw}
        iconPosition="left"
        size="md"
      >
        {loading ? 'Enviando...' : 'Enviar instrucciones'}
      </Button>
      <div class="form-footer">
        <button type="button" class="text-link" on:click={goToLogin}>
          Volver al inicio de sesión
        </button>
      </div>
    </form>
  </div>
</AuthLayout>

<style>
  .subtitle {
    color: var(--text-secondary);
    font-size: 1rem;
    margin-top: var(--spacing-xs);
    font-weight: 500;
  }
  
  .login-form {
    width: 100%;
    margin-bottom: var(--spacing-lg);
  }
  
  .form-footer {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-lg);
  }
  
  .error-message {
    background-color: var(--error-bg);
    color: var(--error-color);
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border-radius: var(--border-radius-lg);
    text-align: left;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    border: none;
    box-shadow: var(--shadow-sm);
  }
  
  .success-message {
    background-color: var(--success-bg);
    color: var(--success-color);
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border-radius: var(--border-radius-lg);
    text-align: left;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    border: none;
    box-shadow: var(--shadow-sm);
  }
  
  .text-link {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    padding: var(--spacing-xs) var(--spacing-sm);
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: var(--border-radius-md);
  }
  
  .text-link:hover {
    background-color: rgba(58, 102, 255, 0.05);
    color: var(--primary-color);
  }
  
  .text-link:active {
    background-color: rgba(58, 102, 255, 0.1);
  }
</style>