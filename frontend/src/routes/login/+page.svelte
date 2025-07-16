<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { APP_CONFIG } from '$lib/config';
  import { User, Lock, Loader, LogIn } from '@lucide/svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  // Verificar si ya está autenticado
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
      
      if (response.responseCode === 0 && response.token) {
        // La autenticación y guardado de datos se maneja en api.login
        console.log('Login exitoso, redirigiendo...');
        goto('/');
      } else {
        error = response.message || 'Error de autenticación. Por favor intente nuevamente.';
      }
    } catch (err) {
      console.error('Error de login:', err);
      error = 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page">
  <div class="login-container animate-in">
    <div class="logo">
      <div class="logo-icon">
        <img src="/favicon.png" alt="Logo" width="42" />
        <div class="logo-glow"></div>
      </div>
      <h1>{APP_CONFIG.appName}</h1>
      <p class="subtitle">Inicia sesión para continuar</p>
    </div>
    
    <div class="login-form">
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
          {loading} 
          icon={loading ? Loader : LogIn}
          iconPosition="left"
          size="md"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </Button>
      </form>
    </div>
    
    <div class="login-footer">
      <p>&copy; {APP_CONFIG.copyrightYear} {APP_CONFIG.appName}</p>
    </div>
  </div>
  
  <!-- Elementos decorativos para fondo -->
  <div class="bg-shape shape-1"></div>
  <div class="bg-shape shape-2"></div>
  <div class="bg-shape shape-3"></div>
  <!-- Fondo abstracto, sin grid -->
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Fondo degradado abstracto, sin grid */
    background: linear-gradient(120deg, #e9eef8 0%, #f5f7fa 60%, #dbeafe 100%);
    position: relative;
    overflow: hidden;
  }
  
  .login-container {
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
    font-size: 1.35rem; /* Aumentado de 1.125rem */
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
    font-size: 1rem; /* Aumentado de 0.875rem */
  }
  
  .login-form {
    width: 100%;
    margin-bottom: var(--spacing-xl);
  }
  
  .login-footer {
    margin-top: var(--spacing-lg);
    text-align: center;
  }
  
  .login-footer p {
    color: var(--text-secondary);
    font-size: 0.75rem;
    opacity: 0.8;
  }
  
  /* Formas decorativas en el fondo */
  .bg-shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    z-index: 1;
    opacity: 0.25;
    pointer-events: none;
  }
  
  .shape-1 {
    width: 380px;
    height: 380px;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    top: -120px;
    right: -120px;
    animation: float 20s ease-in-out infinite;
  }
  
  .shape-2 {
    width: 260px;
    height: 260px;
    background: linear-gradient(135deg, var(--accent-color), #00D4B8);
    bottom: -60px;
    left: -120px;
    animation: float 25s ease-in-out infinite reverse;
  }
  
  .shape-3 {
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
    top: 65%;
    right: 10%;
    animation: float 30s ease-in-out infinite;
  }
  
  .bg-grid { display: none; }
  
  @keyframes float {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }
    25% {
      transform: translate(15px, 20px) rotate(5deg);
    }
    50% {
      transform: translate(5px, -15px) rotate(-5deg);
    }
    75% {
      transform: translate(-15px, 10px) rotate(3deg);
    }
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }
  
  @media (max-width: 768px) {
    .login-container {
      padding: var(--spacing-lg);
    }
    
    .logo h1 {
      font-size: 1.125rem;
    }
  }
</style> 