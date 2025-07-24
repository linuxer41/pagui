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
    <form on:submit|preventDefault={handleForgotPassword}>
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