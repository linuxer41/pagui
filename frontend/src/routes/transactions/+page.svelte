<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  import TransactionList from '$lib/components/TransactionList.svelte';
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Transaction } from '$lib/api';
  
  // Variables para el estado de la página
  let transactions: Transaction[] = [];
  let isLoading = true;
  let hasError = false;
  let errorMessage = '';
  const currency = 'USD';
  
  // Filtros para las transacciones
  let filters = {
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Últimos 30 días
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    type: '',
    page: 1,
    pageSize: 20
  };
  
  // Función para cargar transacciones
  async function loadTransactions() {
    isLoading = true;
    hasError = false;
    errorMessage = '';
    
    try {
      // Llamar a la API para obtener las transacciones
      const response = await api.listTransactions(filters);
      
      if (response.responseCode === 0) {
        transactions = response.transactions;
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      hasError = true;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      isLoading = false;
    }
  }
  
  // Cargar datos al montar el componente
  onMount(async () => {
    // Verificar autenticación
    if (!$auth.isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Cargar transacciones
    await loadTransactions();
  });
</script>

<MainPage>
  <div class="transactions-page" in:fade={{ duration: 300 }}>
    <div class="page-header">
      <h1>Historial de transacciones</h1>
    </div>
    
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Cargando transacciones...</p>
      </div>
    {:else if hasError}
      <div class="error-container">
        <div class="error-icon">!</div>
        <h3>No pudimos cargar tus transacciones</h3>
        <p>{errorMessage}</p>
        <button class="retry-button" on:click={loadTransactions}>
          Intentar nuevamente
        </button>
      </div>
    {:else if transactions.length === 0}
      <div class="empty-container">
        <p>No hay transacciones disponibles</p>
      </div>
    {:else}
      <TransactionList {transactions} {currency} />
    {/if}
  </div>
</MainPage>

<style>
  .transactions-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-bottom: 2rem;
  }
  
  .page-header {
    padding: 0.5rem 1rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }
  
  .page-description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }
  
  .loading-container,
  .error-container,
  .empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 0;
    color: var(--text-secondary);
    gap: 1rem;
    text-align: center;
  }
  
  .loading-spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-container {
    color: var(--error-color);
  }
  
  .error-icon {
    width: 3rem;
    height: 3rem;
    background: rgba(233, 58, 74, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--error-color);
    margin-bottom: 0.5rem;
  }
  
  .error-container h3 {
    margin: 0;
    color: var(--error-color);
  }
  
  .error-container p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  
  .retry-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .retry-button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .empty-container {
    background: var(--surface);
    border-radius: 0.75rem;
    border: 1px dashed var(--border-color);
    margin: 0 1rem;
    padding: 4rem 1rem;
  }
</style>
