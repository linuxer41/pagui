<script lang="ts">
  import '../lib/theme.css';
  
  export let status: number;
  export let error: Error;
  
  let errorTitle = '';
  let errorMessage = '';
  let errorDescription = '';
  let errorSolution = '';
  
  $: {
    switch (status) {
      case 404:
        errorTitle = 'Página no encontrada';
        errorMessage = 'Lo sentimos, la página que buscas no existe o ha sido movida.';
        errorDescription = 'La empresa solicitada no está configurada en el sistema o la URL es incorrecta.';
        errorSolution = 'Verifica que la URL sea correcta o contacta al administrador del sistema.';
        break;
      case 403:
        errorTitle = 'Acceso denegado';
        errorMessage = 'No tienes permisos para acceder a este recurso.';
        errorDescription = 'Tu cuenta no tiene los permisos necesarios para realizar esta operación.';
        errorSolution = 'Contacta al administrador para solicitar los permisos adicionales.';
        break;
      case 500:
        errorTitle = 'Error del servidor';
        errorMessage = 'Ocurrió un error interno en el servidor.';
        errorDescription = 'El servidor experimentó un problema inesperado al procesar tu solicitud.';
        errorSolution = 'Intenta nuevamente en unos minutos o contacta al soporte técnico.';
        break;
      default:
        errorTitle = 'Error inesperado';
        errorMessage = 'Ocurrió un error inesperado.';
        errorDescription = error?.message || 'Se produjo un problema al procesar tu solicitud.';
        errorSolution = 'Intenta nuevamente o contacta al soporte técnico.';
    }
  }
</script>

<div class="error-page">
  <div class="error-container">
    <div class="error-icon">
      {#if status === 404}
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" x2="9" y1="9" y2="15"></line>
          <line x1="9" x2="15" y1="9" y2="15"></line>
        </svg>
      {:else if status === 403}
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <circle cx="12" cy="5" r="2"></circle>
          <path d="M12 7v4"></path>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" x2="12" y1="8" y2="12"></line>
          <line x1="12" x2="12.01" y1="16" y2="16"></line>
        </svg>
      {/if}
    </div>
    
    <div class="error-content">
      <h1 class="error-status">{status}</h1>
      <h2 class="error-title">{errorTitle}</h2>
      <p class="error-message">{errorMessage}</p>
      
      <div class="error-details">
        <div class="error-section">
          <h3>Descripción del problema:</h3>
          <p>{errorDescription}</p>
        </div>
        
        <div class="error-section">
          <h3>Solución recomendada:</h3>
          <p>{errorSolution}</p>
        </div>
      </div>
      
      <div class="error-actions">
        <a href="/" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          Volver al inicio
        </a>
        
        <a href="/recaudaciones" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9,22 9,12 15,12 15,22"></polyline>
          </svg>
          Ver empresas disponibles
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--gradient-multi));
    padding: 2rem;
  }
  
  .error-container {
    max-width: 600px;
    text-align: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 3rem 2rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .error-icon {
    margin-bottom: 2rem;
    color: var(--error);
  }
  
  .error-status {
    font-size: 4rem;
    font-weight: 900;
    color: var(--error);
    margin: 0 0 1rem 0;
    font-family: 'Quenia', serif;
  }
  
  .error-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
    font-family: 'Quenia', serif;
  }
  
  .error-message {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0 0 2rem 0;
    line-height: 1.6;
  }
  
  .error-details {
    text-align: left;
    margin-bottom: 2rem;
  }
  
  .error-section {
    margin-bottom: 1.5rem;
  }
  
  .error-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
  }
  
  .error-section p {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
  }
  
  .btn-primary {
    background: var(--primary);
    color: white;
  }
  
  .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.3);
  }
  
  .btn-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 2px solid var(--border);
  }
  
  .btn-secondary:hover {
    background: var(--background-secondary);
    border-color: var(--primary);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    .error-container {
      padding: 2rem 1.5rem;
    }
    
    .error-status {
      font-size: 3rem;
    }
    
    .error-title {
      font-size: 1.5rem;
    }
    
    .error-actions {
      flex-direction: column;
    }
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
