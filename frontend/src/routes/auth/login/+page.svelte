<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { APP_CONFIG } from '$lib/config';
  import { User, Lock, Loader, LogIn } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { toasts } from '$lib/stores/toast';
  import { fly } from 'svelte/transition';
  import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  onMount(() => {
    if ($auth.isAuthenticated) {
      goto('/');
    }
  });

  async function handleLogin() {
    error = '';
    loading = true;
    try {
      const response = await api.login(email, password);
      if (response.success) {
        goto('/', { replaceState: true });
      } else {
        error = response.message || 'Error de inicio de sesión. Por favor intente nuevamente.';
      }
    } catch (err) {
      console.error('Error de login:', err);
      error = err instanceof Error ? err.message : 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }

  function goToForgotPassword() {
    goto('/auth/forgot-password');
  }
</script>

<AuthLayout>
  <span slot="subtitle">
    <p class="subtitle" in:fly={{ y: 16, duration: 400, delay: 120 }}>
      Inicia sesión para continuar
    </p>
  </span>
  <div class="login-form" in:fly={{ y: 24, duration: 400, delay: 300 }}>
    <form on:submit|preventDefault={handleLogin}>
      <Input
        id="email"
        label="Usuario"
        type="text"
        bind:value={email}
        required
        disabled={loading}
        placeholder="Ingresa tu usuario"
        icon={User}
      />
      <Input
        id="password"
        label="Contraseña"
        type="password"
        bind:value={password}
        required
        disabled={loading}
        placeholder="Ingresa tu contraseña"
        icon={Lock}
      />
      {#if error}
        <div class="error-message message">
          {error}
        </div>
      {/if}
      <Button 
        type="submit" 
        variant="primary" 
        fullWidth 
        loading={loading}
        icon={loading ? Loader : LogIn}
        iconPosition="left"
        size="md"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>
      <div class="form-footer">
        <button type="button" class="text-link" on:click={goToForgotPassword}>
          ¿Olvidaste tu contraseña?
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
  .login-form form {
    display: grid;
    gap: 1.5rem;
  }
  
  .form-footer {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-lg);
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
  
  .message {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border-radius: var(--border-radius-lg);
    text-align: left;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    box-shadow: var(--shadow-sm);
  }
  
  .message::before {
    content: "";
    width: 24px;
    height: 24px;
    margin-right: var(--spacing-sm);
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    flex-shrink: 0;
  }
  
  .error-message {
    background-color: var(--error-bg);
    color: var(--error-color);
  }
  
  .error-message::before {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23E93A4A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='8' x2='12' y2='12'%3E%3C/line%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'%3E%3C/line%3E%3C/svg%3E");
  }
  
</style> 