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

<div class="search-content">
  <div class="search-header">
    <h2>Consulta tus Facturas</h2>
    <p class="instructions">{instrucciones}</p>
  </div>
  
  <form class="search-form" on:submit|preventDefault={onBuscar}>
    <div class="input-group">
      <label for="codigoCliente">Código de Cliente</label>
      <input
        id="codigoCliente"
        type="text"
        bind:value={codigoClienteInput}
        placeholder="Código de cliente (ej: CLI001, MED001, AUTO001)"
        required
        disabled={isLoading}
      />
    </div>
    
    <button type="submit" class="btn-search" disabled={isLoading}>
      {#if isLoading}
        <span class="spinner"></span>
        Buscando...
      {:else}
        <SearchIcon size="16" />
        Buscar Cuenta
      {/if}
    </button>
  </form>
  
  {#if error}
    <div class="error-message">
      <AlertCircleIcon size="14" />
      {error}
    </div>
  {/if}
    
  {#if searchResult && searchResult.success}
    <div class="success-message">
      <CheckCircleIcon size="14" />
      {searchResult.mensaje}
    </div>
  {/if}
   
  {#if searchResult && !searchResult.success}
   <div class="error-message">
     <AlertCircleIcon size="14" />
     {searchResult.error}
   </div>
  {/if}
</div>

<style>
  .search-content {
    text-align: center;
  }
  
  .search-header h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    text-align: center;
  }
  
  .instructions {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
    line-height: 1.3;
    text-align: center;
  }
  
  .search-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 350px;
    margin: 0 auto;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .input-group label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
  
  .input-group input {
    padding: 0.75rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 0.9rem;
    background: var(--background-primary);
    color: var(--text-primary);
    transition: var(--transition);
    font-weight: 500;
    box-shadow: var(--shadow-sm);
  }
  
  .input-group input::placeholder {
    color: var(--text-secondary);
  }
  
  .input-group input:focus {
    outline: none;
    border-color: rgb(var(--primary));
    background: var(--background-primary);
    box-shadow: var(--shadow);
    transform: translateY(-1px);
  }
  
  .btn-search {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    justify-content: center;
    background: var(--gradient-primary);
    color: rgb(var(--white));
    box-shadow: var(--shadow);
  }
  
  .btn-search:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
    background: var(--gradient-secondary);
  }
  
  .btn-search:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--gray-200), 0.3);
    border-top: 2px solid rgb(var(--primary));
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(var(--error), 0.1);
    color: rgb(var(--error));
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-top: 1rem;
    font-weight: 600;
    font-size: 0.85rem;
    border: 2px solid rgba(var(--error), 0.2);
    box-shadow: var(--shadow-sm);
  }
  
  .success-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(var(--success), 0.1);
    color: rgb(var(--success));
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-top: 1rem;
    font-weight: 600;
    font-size: 0.85rem;
    border: 2px solid rgba(var(--success), 0.2);
    box-shadow: var(--shadow-sm);
  }
</style>
