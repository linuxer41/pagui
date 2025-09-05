<script lang="ts">
  import { goto } from '$app/navigation';
  import { APP_CONFIG } from '$lib/config';
  import { onMount } from 'svelte';
  import { Mail, User, Building, Phone, Check, AlertCircle } from '@lucide/svelte';
  import Input from '$lib/components/Input.svelte';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import AuthLayout from '$lib/components/layouts/AuthLayout.svelte';
  import { fly } from 'svelte/transition';
  
  // Estado del formulario
  let fullName = '';
  let email = '';
  let company = '';
  let phone = '';
  let message = '';
  let termsAccepted = false;
  
  // Estado de validación
  let isSubmitting = false;
  let submitSuccess = false;
  let submitError = false;
  let errorMessage = '';
  
  // Validación del formulario
  function validateForm(): boolean {
    if (!fullName || !email || !company || !phone || !message || !termsAccepted) {
      errorMessage = 'Por favor completa todos los campos y acepta los términos.';
      return false;
    }
    
    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage = 'Por favor ingresa un correo electrónico válido.';
      return false;
    }
    
    // Validación básica de teléfono
    const phoneRegex = /^[0-9+\s()-]{8,15}$/;
    if (!phoneRegex.test(phone)) {
      errorMessage = 'Por favor ingresa un número de teléfono válido.';
      return false;
    }
    
    return true;
  }
  
  // Enviar solicitud
  async function handleSubmit() {
    submitError = false;
    errorMessage = '';
    
    if (!validateForm()) {
      submitError = true;
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Aquí se implementaría la llamada API real para enviar la solicitud
      // Por ahora simulamos una respuesta exitosa después de un retraso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulación exitosa
      submitSuccess = true;
      isSubmitting = false;
      
      // Limpiar formulario después de envío exitoso
      fullName = '';
      email = '';
      company = '';
      phone = '';
      message = '';
      termsAccepted = false;
      
    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      submitError = true;
      errorMessage = 'Ocurrió un error al enviar tu solicitud. Por favor intenta nuevamente.';
      isSubmitting = false;
    }
  }
  
  // Volver a la página inicial
  function goBack() {
    goto('/init');
  }
  
  // Ir a la página de login
  function goToLogin() {
    goto('/auth/login');
  }
</script>

<svelte:head>
  <title>Solicitar cuenta | {APP_CONFIG.appName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</svelte:head>

<AuthLayout>
  <span slot="subtitle">
    <p class="subtitle" in:fly={{ y: 16, duration: 400, delay: 120 }}>Solicita tu cuenta personalizada</p>
  </span>
  {#if submitSuccess}
    <div class="success-message" in:fly={{ y: 24, duration: 400, delay: 200 }}>
      <div class="success-icon">
        <Check size={40} />
      </div>
      <h2>¡Solicitud enviada!</h2>
      <p>Hemos recibido tu solicitud correctamente. Nuestro equipo la revisará y te contactará en breve para los siguientes pasos.</p>
      <button class="primary-button" on:click={goBack}>
        Volver al inicio
      </button>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="register-form" in:fly={{ y: 24, duration: 400, delay: 200 }}>
      <div class="form-body" in:fly={{ y: 16, duration: 400, delay: 250 }} style="display: flex; flex-direction: column; gap: var(--spacing-md)">
        {#if submitError}
          <div class="error-message">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        {/if}
        <div class="form-group">
          <Input
            id="fullName"
            name="fullName"
            type="text"
            bind:value={fullName}
            placeholder="Ingresa tu nombre completo"
            required
            icon={User}
            label="Nombre completo"
          />
        </div>
        <div class="form-group">
          <Input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            placeholder="tu@empresa.com"
            required
            icon={Mail}
            label="Correo electrónico"
          />
        </div>
        <div class="form-group">
          <Input
            id="company"
            name="company"
            type="text"
            bind:value={company}
            placeholder="Nombre de tu empresa"
            required
            icon={Building}
            label="Empresa"
          />
        </div>
        <div class="form-group">
          <Input
            id="phone"
            name="phone"
            type="tel"
            bind:value={phone}
            placeholder="+34 612 345 678"
            required
            icon={Phone}
            label="Teléfono"
          />
        </div>
        <div class="form-group">
          <Input
            id="message"
            name="message"
            type="textarea"
            bind:value={message}
            placeholder="Cuéntanos sobre tu negocio y cómo podemos ayudarte..."
            required
            label="¿Cómo podemos ayudarte?"
          />
        </div>
        <div class="form-group checkbox-group" in:fly={{ y: 12, duration: 400, delay: 350 }}>
          <Checkbox
            id="terms"
            name="terms"
            bind:checked={termsAccepted}
            required
            label="Acepto los"
            linkText="términos y condiciones"
            linkHref="/terms"
          />
          <span style="margin-left:2.2em;font-size:0.85rem;">y la política de privacidad</span>
        </div>
        <button 
          type="submit" 
          class="primary-button submit-button" 
          disabled={isSubmitting}
          in:fly={{ y: 10, duration: 400, delay: 400 }}
        >
          {#if isSubmitting}
            <span class="loading-spinner"></span>
            <span>Enviando...</span>
          {:else}
            <span>Enviar solicitud</span>
          {/if}
        </button>
      </div>
      <div class="login-prompt" in:fly={{ y: 16, duration: 400, delay: 500 }}>
        <p>¿Ya tienes una cuenta?</p>
        <button class="text-button" on:click={goToLogin}>Iniciar sesión</button>
      </div>
    </form>
  {/if}
</AuthLayout>

<style>
  
  
  .register-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: var(--spacing-sm);
  }
  
    
  .checkbox-group {
    margin-top: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
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
  }
  
  .primary-button:active {
    transform: scale(0.98);
  }
  
  .primary-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .submit-button {
    margin-top: var(--spacing-sm);
  }
  
  .text-button {
    background: transparent;
    color: var(--primary-color);
    border: none;
    font-size: 0.9rem;
    font-weight: 500;
    padding: var(--spacing-xs);
    cursor: pointer;
    font-family: inherit;
  }
  
  /* Mensaje de error */
  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    background-color: rgba(255, 76, 76, 0.1);
    color: #ff4c4c;
    font-size: 0.9rem;
    margin-bottom: var(--spacing-sm);
  }
  
  /* Mensaje de éxito */
  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-md);
  }
  
  .success-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: #4caf50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
  }
  
  .success-message h2 {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-md);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  
  .success-message p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;
    font-size: 1rem;
    font-weight: 400;
  }
  
  /* Prompt de login */
  .login-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: var(--spacing-lg);
    gap: var(--spacing-xs);
  }
  
  .login-prompt p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
  }
  
  /* Spinner de carga */
  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style> 