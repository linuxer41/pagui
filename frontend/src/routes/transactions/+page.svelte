<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { ArrowDownLeft, ArrowUpRight } from '@lucide/svelte';
  import { scale } from 'svelte/transition';
  import Modal from '$lib/components/Modal.svelte';
  
  // Variables para el estado de la página
  let movements: any[] = [];
  let isLoading = true;
  let hasError = false;
  let errorMessage = '';
  let currentAccount: any = null;
  let currency = 'BOB';
  
  // Paginación
  let currentPage = 1;
  let pageSize = 20;
  let hasMorePages = false;
  
  // Modal state
  let showMovementModal = false;
  let selectedMovement: any = null;
  
  // Función para cargar movimientos de cuenta
  async function loadAccountMovements() {
    if (!currentAccount) return;
    
    isLoading = true;
    hasError = false;
    errorMessage = '';
    
    try {
      const response = await api.getAccountMovements(currentAccount.id, currentPage, pageSize);
      
      if (response.success && response.data) {
        movements = response.data;
        hasMorePages = movements.length === pageSize;
      } else {
        throw new Error(response.message || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error cargando movimientos de cuenta:', error);
      hasError = true;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      isLoading = false;
    }
  }
  
  // Función para cargar más movimientos
  async function loadMoreMovements() {
    if (isLoading || !hasMorePages) return;
    
    currentPage++;
    try {
      const response = await api.getAccountMovements(currentAccount.id, currentPage, pageSize);
      
      if (response.success && response.data) {
        movements = [...movements, ...response.data];
        hasMorePages = response.data.length === pageSize;
      }
    } catch (error) {
      console.error('Error cargando más movimientos:', error);
      currentPage--; // Revertir el incremento en caso de error
    }
  }
  
  // Función para abrir el modal de detalles del movimiento
  function openMovementModal(movement: any) {
    selectedMovement = movement;
    showMovementModal = true;
  }
  
  // Función para cerrar el modal
  function closeMovementModal() {
    showMovementModal = false;
    selectedMovement = null;
  }
  
  // Formatear fecha para mostrar de forma amigable
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Hoy, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Ayer, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  
  // Formatear montos con separador de miles y decimales
  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Función para obtener el símbolo de moneda
  function getCurrencySymbol(currency: string): string {
    switch (currency.toUpperCase()) {
      case 'BOB':
        return 'Bs.';
      case 'USD':
        return '$';
      default:
        return currency;
    }
  }
  
  // Cargar datos al montar el componente
  onMount(async () => {
    try {
      // Obtener la cuenta actual del usuario
      const accountsResponse = await api.getAccounts();
      if (accountsResponse.success && accountsResponse.data && accountsResponse.data.length > 0) {
        currentAccount = accountsResponse.data[0];
        currency = currentAccount.currency;
        
        // Cargar movimientos de la cuenta
        await loadAccountMovements();
      } else {
        throw new Error('No se encontraron cuentas');
      }
    } catch (error) {
      console.error('Error inicializando página:', error);
      hasError = true;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      isLoading = false;
    }
  });
</script>

<RouteLayout title="Movimientos de Cuenta">
  <div class="movements-page" in:fade={{ duration: 300 }}>
    <div class="page-header">
      <h1>Movimientos de Cuenta</h1>
      <p class="page-description">Historial completo de todos los movimientos de tu cuenta</p>
    </div>
    
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Cargando movimientos...</p>
      </div>
    {:else if hasError}
      <div class="error-container">
        <div class="error-icon">!</div>
        <h3>No pudimos cargar tus movimientos</h3>
        <p>{errorMessage}</p>
        <button class="retry-button" on:click={loadAccountMovements}>
          Intentar nuevamente
        </button>
      </div>
    {:else if movements.length === 0}
      <div class="empty-container">
        <p>No hay movimientos disponibles</p>
      </div>
    {:else}
      <div class="movements-list">
        {#each movements as movement, i (movement.id)}
          <div class="movement-item" in:fly={{ y: 20, duration: 400, delay: 100 + i * 50 }} on:click={() => openMovementModal(movement)} on:keydown={(e) => e.key === 'Enter' && openMovementModal(movement)} role="button" tabindex="0">
            <div class="movement-icon {movement.movementType === 'qr_payment' ? 'incoming' : 'outgoing'}">
              {#if movement.movementType === 'qr_payment'}
                <ArrowDownLeft size={18} />
              {:else}
                <ArrowUpRight size={18} />
              {/if}
            </div>
            <div class="movement-details">
              <div class="movement-title">
                {movement.senderName || movement.description || 'Movimiento de cuenta'}
              </div>
              <div class="movement-date">{formatDate(movement.createdAt)}</div>
            </div>
            <div class="movement-amount {movement.movementType === 'qr_payment' ? 'income' : 'expense'}">
              {movement.movementType === 'qr_payment' ? '+' : '-'} {getCurrencySymbol(movement.currency || currency)} <span in:scale={{ duration: 500 }}>{formatCurrency(movement.amount)}</span>
            </div>
          </div>
        {/each}
        
        {#if hasMorePages}
          <div class="load-more-container">
            <button class="load-more-button" on:click={loadMoreMovements} disabled={isLoading}>
              {isLoading ? 'Cargando...' : 'Cargar más movimientos'}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</RouteLayout>

<!-- Modal para detalles del movimiento -->
{#if showMovementModal && selectedMovement}
  <div class="modal-overlay" on:click={closeMovementModal} on:keydown={(e) => e.key === 'Escape' && closeMovementModal()} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <div class="modal-content" on:click|stopPropagation role="document" on:keydown={(e) => e.key === 'Escape' && closeMovementModal()}>
      <div class="modal-header">
        <h2 id="modal-title">Detalles del Movimiento</h2>
        <button class="modal-close" on:click={closeMovementModal}>×</button>
      </div>
      <div class="modal-body">
        <div class="movement-details">
          <!-- Información principal -->
          <div class="detail-section">
            <div class="detail-item">
              <span class="detail-label">Remitente:</span>
              <span class="detail-value">{selectedMovement.senderName || 'No disponible'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Descripción:</span>
              <span class="detail-value">{selectedMovement.description}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Monto:</span>
              <span class="detail-value amount">{selectedMovement.movementType === 'qr_payment' ? '+' : '-'} {getCurrencySymbol(selectedMovement.currency || currency)} {formatCurrency(selectedMovement.amount)}</span>
            </div>
          </div>
          
          <!-- Información de la transacción -->
          <div class="detail-section">
            <h3>Información de la Transacción</h3>
            <div class="detail-item">
              <span class="detail-label">ID de Transacción:</span>
              <span class="detail-value code">{selectedMovement.transactionId || 'No disponible'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Referencia:</span>
              <span class="detail-value code">{selectedMovement.reference || 'No disponible'}</span>
            </div>
            {#if selectedMovement.qrId}
              <div class="detail-item">
                <span class="detail-label">ID QR:</span>
                <span class="detail-value code">{selectedMovement.qrId}</span>
              </div>
            {/if}
          </div>
          
          <!-- Información del remitente -->
          {#if selectedMovement.senderAccount || selectedMovement.senderBankCode}
            <div class="detail-section">
              <h3>Información del Remitente</h3>
              {#if selectedMovement.senderAccount}
                <div class="detail-item">
                  <span class="detail-label">Cuenta:</span>
                  <span class="detail-value code">{selectedMovement.senderAccount}</span>
                </div>
              {/if}
              {#if selectedMovement.senderBankCode}
                <div class="detail-item">
                  <span class="detail-label">Código de Banco:</span>
                  <span class="detail-value code">{selectedMovement.senderBankCode.trim()}</span>
                </div>
              {/if}
              {#if selectedMovement.senderDocumentId}
                <div class="detail-item">
                  <span class="detail-label">Documento:</span>
                  <span class="detail-value code">{selectedMovement.senderDocumentId}</span>
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- Fechas y horarios -->
          <div class="detail-section">
            <h3>Fechas y Horarios</h3>
            <div class="detail-item">
              <span class="detail-label">Fecha de Creación:</span>
              <span class="detail-value">{formatDate(selectedMovement.createdAt)}</span>
            </div>
            {#if selectedMovement.paymentDate}
              <div class="detail-item">
                <span class="detail-label">Fecha de Pago:</span>
                <span class="detail-value">{new Date(selectedMovement.paymentDate).toLocaleDateString('es-ES')}</span>
              </div>
            {/if}
            {#if selectedMovement.paymentTime}
              <div class="detail-item">
                <span class="detail-label">Hora de Pago:</span>
                <span class="detail-value">{selectedMovement.paymentTime}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .movements-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-bottom: 2rem;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .page-description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }
  
  .movements-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
  }
  
  .movement-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem;
    background: var(--surface);
    border-radius: 0.75rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    margin-bottom: 0.5rem;
    cursor: pointer;
  }
  
  .movement-item:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
    background: linear-gradient(135deg, var(--surface) 0%, rgba(0, 202, 141, 0.02) 100%);
  }
  
  .movement-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  
  .movement-icon.incoming {
    background: linear-gradient(135deg, rgba(0, 202, 141, 0.15) 0%, rgba(0, 202, 141, 0.05) 100%);
    color: var(--success-color);
    border: 1px solid rgba(0, 202, 141, 0.2);
  }
  
  .movement-icon.outgoing {
    background: linear-gradient(135deg, rgba(233, 58, 74, 0.15) 0%, rgba(233, 58, 74, 0.05) 100%);
    color: var(--error-color);
    border: 1px solid rgba(233, 58, 74, 0.2);
  }
  
  .movement-details {
    flex: 1;
    min-width: 0;
  }
  
  .movement-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .movement-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
  
  .movement-amount {
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
  }
  
  .movement-amount.income {
    color: var(--success-color);
    background: rgba(0, 202, 141, 0.1);
  }
  
  .movement-amount.expense {
    color: var(--error-color);
    background: rgba(233, 58, 74, 0.1);
  }
  
  .load-more-container {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }
  
  .load-more-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .load-more-button:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .load-more-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  
  /* Estilos del Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background: var(--surface);
    border-radius: 1rem;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    background: var(--surface);
    border-radius: 1rem 1rem 0 0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }
  
  .modal-close:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .movement-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-section h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
  }
  
  .detail-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .detail-value {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  
  .detail-value.amount {
    color: var(--success-color);
    font-size: 1rem;
  }
  
  .detail-value.code {
    font-family: 'Courier New', monospace;
    background: rgba(0, 202, 141, 0.1);
    color: var(--primary-color);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
  }
  
  @media (max-width: 640px) {
    .modal-content {
      margin: 0.5rem;
      max-height: 90vh;
    }
    
    .modal-header {
      padding: 1rem;
      flex-shrink: 0;
    }
    
    .modal-body {
      padding: 1rem;
      overflow-y: auto;
      flex: 1;
    }
    
    .detail-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .detail-value {
      max-width: 100%;
      text-align: left;
    }
  }
</style>
