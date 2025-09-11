<script lang="ts">
  import { AlertCircleIcon, CheckCircleIcon, SearchIcon } from 'svelte-feather-icons';

  // Props
  export let codigoClienteInput: string = '';
  export let isLoading: boolean = false;
  export let searchResult: any = null;
  export let error: string | null = null;
  export let instrucciones: string = '';

  // Evento que se disparará al enviar el formulario
  export let onBuscar: () => void;
</script>

<div class="search-form-container">
  <form class="search-form" on:submit|preventDefault={onBuscar}>
    <input
      id="codigoCliente"
      type="text"
      bind:value={codigoClienteInput}
      placeholder="Número de cliente o abonado"
      class="form-input"
      required
      disabled={isLoading}
    />
    
    <button type="submit" class="search-button" disabled={isLoading}>
      {#if isLoading}
        <span class="button-spinner"></span>
      {:else}
        <SearchIcon size="18" />
      {/if}
    </button>
  </form>
  
  {#if error}
    <div class="alert alert-error">
      <AlertCircleIcon size="16" />
      <span>{error}</span>
    </div>
  {/if}
    
  {#if searchResult && searchResult.success}
    <div class="alert alert-success">
      <CheckCircleIcon size="16" />
      <span>{searchResult.mensaje}</span>
    </div>
  {/if}
   
  {#if searchResult && !searchResult.success}
   <div class="alert alert-error">
     <AlertCircleIcon size="16" />
     <span>{searchResult.error}</span>
   </div>
  {/if}
</div>

<style>
  /* Variables CSS para consistencia */
  :root {
    --color-primary: #667eea;
    --color-primary-dark: #5a67d8;
    --color-primary-light: #a5b4fc;
    --color-success: #22c55e;
    --color-error: #ef4444;
    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666666;
    --color-text-muted: #999999;
    --color-bg-primary: #ffffff;
    --color-border: #e5e5e5;
    --color-border-light: #f5f5f5;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
  }

  .search-form-container {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .search-form {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  
  .form-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    transition: all 0.2s ease;
    font-weight: 400;
  }
  
  .form-input::placeholder {
    color: var(--color-text-muted);
    font-weight: 400;
  }
  
  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
  
  .form-input:disabled {
    background: #f8f9fa;
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
  
  .search-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .search-button:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }
  
  .search-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .button-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: 1rem;
    box-shadow: var(--shadow-sm);
  }
  
  .alert-error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .alert-success {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }
  
  .alert span {
    flex: 1;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .search-form-container {
      max-width: 100%;
    }
    
    .search-form {
      gap: 0.5rem;
    }
    
    .form-input {
      padding: 0.625rem 0.875rem;
      font-size: 0.8rem;
    }
    
    .search-button {
      width: 40px;
      height: 40px;
    }
  }
</style>
