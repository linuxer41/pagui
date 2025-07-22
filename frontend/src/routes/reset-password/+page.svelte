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
    goto('/login');
  }
</script>

<div class="reset-page">
  <div class="reset-container animate-in">
    <div class="logo">
      <div class="logo-icon">
        <img src="/favicon.png" alt="Logo" width="42" />
        <div class="logo-glow"></div>
      </div>
      <h1>{APP_CONFIG.appName}</h1>
      <p class="subtitle">Restablecer contraseña</p>
    </div>
    
    <div class="reset-form">
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
        <form on:submit|preventDefault={handleResetPassword}>
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
            <a href="/login" class="text-link">
              Volver al inicio de sesión
            </a>
          </div>
        </form>
      {/if}
    </div>
    
    <div class="reset-footer">
      <p>&copy; {APP_CONFIG.copyrightYear} {APP_CONFIG.appName}</p>
    </div>
  </div>
  
  <!-- Elementos decorativos para fondo -->
  <div class="bg-shape shape-1"></div>
  <div class="bg-shape shape-2"></div>
  <div class="bg-shape shape-3"></div>
</div>

<style>
  .reset-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(120deg, #e9eef8 0%, #f5f7fa 60%, #dbeafe 100%);
    position: relative;
    overflow: hidden;
  }
  
  .reset-container {
    width: 100%;
    max-width: 360px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
  }
  
  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-xl);
  }
  
  .logo-icon {
    position: relative;
    margin-bottom: var(--spacing-md);
  }
  
  .logo-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(58, 102, 255, 0.15) 0%, rgba(58, 102, 255, 0) 70%);
    z-index: -1;
    animation: pulse 4s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0.5;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 0.8;
    }
    100% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0.5;
    }
  }
  
  .logo h1 {
    font-size: 1.35rem;
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
    text-align: center;
    position: relative;
    display: inline-block;
  }
  
  .logo h1::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
    border-radius: var(--border-radius-full);
  }
  
  .subtitle {
    color: var(--text-secondary);
    margin-bottom: 0;
    font-size: 0.875rem;
  }
  
  .reset-form {
    width: 100%;
    margin-bottom: var(--spacing-xl);
  }
  
  .form-footer {
    display: flex;
    justify-content: center;
    margin-top: var(--spacing-md);
  }
  
  .text-link {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0;
    text-decoration: underline;
    transition: color 0.2s;
    display: inline-block;
  }
  
  .text-link:hover {
    color: var(--accent-color);
  }
  
  .message {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    text-align: center;
    font-size: 0.875rem;
  }
  
  .error-message {
    background-color: var(--danger-background);
    color: var(--danger-color);
    border: 1px solid var(--danger-border);
  }
  
  .success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-lg);
    text-align: center;
  }
  
  .success-icon {
    background: var(--success-background);
    border-radius: 50%;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-md);
    border: 2px solid var(--success-color);
  }
  
  .success-container h2 {
    font-size: 1.25rem;
    margin-bottom: var(--spacing-sm);
    color: var(--success-color);
  }
  
  .success-container p {
    margin-bottom: var(--spacing-lg);
    color: var(--text-secondary);
  }
  
  .reset-footer {
    margin-top: var(--spacing-lg);
    text-align: center;
  }
  
  .reset-footer p {
    color: var(--text-secondary);
    font-size: 0.75rem;
    opacity: 0.8;
  }
  
  /* Formas de fondo decorativas */
  .bg-shape {
    position: absolute;
    border-radius: 50%;
    opacity: 0.05;
    background: var(--primary-color);
  }
  
  .shape-1 {
    width: 300px;
    height: 300px;
    top: -150px;
    right: -100px;
  }
  
  .shape-2 {
    width: 400px;
    height: 400px;
    bottom: -200px;
    left: -200px;
  }
  
  .shape-3 {
    width: 200px;
    height: 200px;
    top: 30%;
    right: 10%;
  }
  
  .animate-in {
    animation: fadeIn 0.8s ease-out forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style> 