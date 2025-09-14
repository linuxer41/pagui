<script lang="ts">
  import { AlertCircleIcon, CheckCircleIcon, SearchIcon } from 'svelte-feather-icons';

  // Props
  export let codigoClienteInput: string = '';
  export let tipoBusqueda: 'nombre' | 'documento' | 'abonado' = 'abonado';
  export let isLoading: boolean = false;
  export let searchResult: any = null;
  export let error: string | null = null;

  // Evento que se disparará al enviar el formulario
  export let onBuscar: () => void;
</script>

<div class="search-form-container">
  <form class="search-form" on:submit|preventDefault={onBuscar}>
    <!-- Selector de tipo de búsqueda -->
    <div class="search-type-selector">
      <label for="tipoBusqueda" class="search-type-label">Buscar por:</label>
      <select 
        id="tipoBusqueda" 
        bind:value={tipoBusqueda}
        class="search-type-select"
        disabled={isLoading}
      >
        <option value="abonado">Número de Abonado</option>
        <option value="nombre">Nombre del Cliente</option>
        <option value="documento">Documento/NIT</option>
      </select>
    </div>
    
    <div class="input-group">
      <input
        id="codigoCliente"
        type="text"
        bind:value={codigoClienteInput}
        placeholder={tipoBusqueda === 'abonado' ? 'Número de abonado' : tipoBusqueda === 'nombre' ? 'Nombre del cliente' : 'Documento o NIT'}
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
    </div>
  </form>
  
  {#if error}
    <div class="message message-error">
      <AlertCircleIcon size="16" />
      <span>{error}</span>
    </div>
  {/if}
    
  {#if searchResult && searchResult.success}
    <div class="message message-success">
      <CheckCircleIcon size="16" />
      <span>{searchResult.mensaje}</span>
    </div>
  {/if}
   
  {#if searchResult && !searchResult.success}
   <div class="message message-error">
     <AlertCircleIcon size="16" />
     <span>{searchResult.error}</span>
   </div>
  {/if}
</div>

<style>
  .search-form-container {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }
  
  .search-form {
    width: 100%;
  }

  .search-type-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .search-type-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #000000;
    white-space: nowrap;
  }

  .search-type-select {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    background: white;
    font-size: 0.875rem;
    color: #000000;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .search-type-select:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .search-type-select:disabled {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.38);
    cursor: not-allowed;
  }

  .input-group {
    position: relative;
    display: flex;
    align-items: center;
    background: transparent;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .input-group:focus-within {
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
  
  .form-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    color: #000000;
    font-weight: 400;
    outline: none;
  }
  
  .form-input::placeholder {
    color: rgba(0, 0, 0, 0.6);
    font-weight: 400;
  }
  
  .form-input:disabled {
    color: rgba(0, 0, 0, 0.38);
    cursor: not-allowed;
  }
  
  .search-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: #000000;
    color: white;
    cursor: pointer;
    flex-shrink: 0;
    margin: 3px;
    border-radius: 6px;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .search-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.8);
  }
  
  .search-button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.12);
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
  
  .message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 400;
    margin-top: 0.75rem;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .message-error {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.2);
    background: rgba(254, 226, 226, 0.3);
  }
  
  .message-success {
    color: #059669;
    border-color: rgba(5, 150, 105, 0.2);
    background: rgba(220, 252, 231, 0.3);
  }
  
  .message span {
    flex: 1;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .search-form-container {
      max-width: 100%;
    }
    
    .search-type-selector {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.625rem;
    }

    .search-type-label {
      font-size: 0.8rem;
    }

    .search-type-select {
      width: 100%;
      font-size: 0.8rem;
    }
    
    .input-group {
      border-radius: 6px;
    }
    
    .form-input {
      padding: 0.625rem 0.875rem;
      font-size: 0.9rem;
    }
    
    .search-button {
      width: 36px;
      height: 36px;
      margin: 2px;
    }

    .message {
      padding: 0.625rem;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }
  }
</style>
