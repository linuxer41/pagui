<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { APP_CONFIG } from '$lib/config';
  import { toasts } from '$lib/stores/toast';
  import { page } from '$app/stores';
  import { Key, Loader, Check, Lock } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';
    import { fly } from 'svelte/transition';
  
  let token = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let resetSuccess = false;
  
  // Verificar si ya está autenticado
  onMount(() => {
    // Si está autenticado, redirigir al inicio
    if ($auth.isAuthenticated) {
      goto('/');
      return;
    }
    
    // Obtener token de la URL si existe
    const url = new URL(window.location.href);
    token = url.searchParams.get('token') || '';
    
    if (!token) {
      error = 'Token inválido o no proporcionado';
    }
  });
  
  // Función para validar formulario
  function validateForm(): boolean {
    if (!token) {
      error = 'Token inválido o no proporcionado';
      return false;
    }
    
    if (!password) {
      error = 'Debe ingresar una contraseña';
      return false;
    }
    
    if (password !== confirmPassword) {
      error = 'Las contraseñas no coinciden';
      return false;
    }
    
    if (password.length < 8) {
      error = 'La contraseña debe tener al menos 8 caracteres';
      return false;
    }
    
    return true;
  }
  
  // Manejar envío del formulario
  async function handleResetPassword() {
    error = '';
    
    if (!validateForm()) return;
    
    loading = true;
    
    try {
      const response = await api.resetPassword(token, password);
      
      if (response.success) {
        resetSuccess = true;
        toasts.show('Contraseña cambiada con éxito', 'success');
      } else {
        error = response.message || 'Error al restablecer la contraseña';
      }
    } catch (err) {
      console.error('Error al restablecer contraseña:', err);
      error = err instanceof Error ? err.message : 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }
  
  // Redirigir al login después de cambio exitoso
  function goToLogin() {
    goto('/auth/login');
  }
</script>

<AuthLayout>
  <span slot="subtitle">
    <p class="subtitle" in:fly={{ y: 16, duration: 400, delay: 120 }}>Restablecer contraseña</p>
  </span>
  <div class="reset-form" in:fly={{ y: 24, duration: 400, delay: 300 }}>
    {#if resetSuccess}
      <div class="success-container">
        <div class="success-icon">
          <Check size={48} stroke="var(--success-color)" />
        </div>
        <h2>¡Contraseña actualizada!</h2>
        <p>Tu contraseña ha sido actualizada correctamente.</p>
        <Button 
          type="button" 
          variant="primary" 
          fullWidth 
          on:click={goToLogin}
          size="md"
        >
          Ir al inicio de sesión
        </Button>
      </div>
    {:else}
      <form on:submit|preventDefault={handleResetPassword} style="display: flex; flex-direction: column; gap: var(--spacing-md)">
        <Input
          id="password"
          label="Nueva contraseña"
          type="password"
          bind:value={password}
          required
          disabled={loading || !token}
          placeholder="Ingresa tu nueva contraseña"
          icon={Key}
        />
        <Input
          id="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          bind:value={confirmPassword}
          required
          disabled={loading || !token}
          placeholder="Confirma tu nueva contraseña"
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
          disabled={!token}
          icon={loading ? Loader : Check}
          iconPosition="left"
          size="md"
        >
          {loading ? 'Procesando...' : 'Restablecer contraseña'}
        </Button>
        <div class="form-footer">
          <button type="button" class="primary-button login-button" on:click={goToLogin}>
            Volver al inicio de sesión
          </button>
        </div>
      </form>
    {/if}
  </div>
</AuthLayout>

<style>
  .subtitle {
    color: var(--text-secondary);
    font-size: 1rem;
    margin-top: var(--spacing-xs);
    font-weight: 500;
  }
  
  .reset-form {
    width: 100%;
    margin-bottom: var(--spacing-lg);
  }
  
  .form-footer {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-lg);
  }
  
  .primary-button {
    width: 100%;
    height: 48px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    border: none;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    color: white;
    box-shadow: 0 4px 10px rgba(58, 102, 255, 0.2);
    position: relative;
    overflow: hidden;
    transition: transform 0.15s ease;
    letter-spacing: -0.01em;
    font-family: inherit;
    cursor: pointer;
  }
  
  .primary-button:active {
    transform: scale(0.98);
  }
  
  .login-button {
    margin-top: var(--spacing-sm);
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
  
  .success-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-lg);
    text-align: center;
    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .success-icon {
    background: var(--success-bg);
    border-radius: 50%;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-md);
    border: none;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
  }

  .success-icon::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 202, 141, 0.1), rgba(0, 202, 141, 0.2));
    z-index: 0;
  }
  
  
  .success-container h2 {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-weight: 700;
  }
  
  .success-container p {
    margin-bottom: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: 1rem;
  }
</style>