<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { QrCode, Clock, CheckCircle, XCircle, Eye, Calendar } from '@lucide/svelte';
  
  interface QRItem {
    id: string;
    qrId: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
    createdAt: string;
    dueDate?: string;
    singleUse: boolean;
    modifyAmount: boolean;
    paymentDate?: string;
    paymentAmount?: number;
    senderName?: string;
  }
  
  // Variables para el estado de la página
  let qrList: QRItem[] = [];
  let isLoading = true;
  let hasError = false;
  let errorMessage = '';
  
  // Paginación
  let currentPage = 1;
  let pageSize = 20;
  let hasMorePages = false;
  
  // Función para cargar lista de QRs
  async function loadQrList() {
    isLoading = true;
    hasError = false;
    errorMessage = '';
    
    try {
      const response = await api.getQrList(currentPage, pageSize);
      
      if (response.success && response.data) {
        qrList = response.data;
        hasMorePages = qrList.length === pageSize;
      } else {
        throw new Error(response.message || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error cargando lista de QRs:', error);
      hasError = true;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      isLoading = false;
    }
  }
  
  // Función para cargar más QRs
  async function loadMoreQrs() {
    if (isLoading || !hasMorePages) return;
    
    currentPage++;
    try {
      const response = await api.getQrList(currentPage, pageSize);
      
      if (response.success && response.data) {
        qrList = [...qrList, ...response.data];
        hasMorePages = response.data.length === pageSize;
      }
    } catch (error) {
      console.error('Error cargando más QRs:', error);
      currentPage--; // Revertir el incremento en caso de error
    }
  }
  
  // Función para ver el estado del QR
  function viewQrStatus(qr: QRItem) {
    goto(`/qr/status?id=${qr.qrId}`);
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
  
  // Función para obtener el color del estado
  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'success';
      case 'pending':
      case 'active':
        return 'warning';
      case 'expired':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  }
  
  // Función para obtener el texto del estado
  function getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'Pagado';
      case 'pending':
      case 'active':
        return 'Pendiente';
      case 'expired':
        return 'Expirado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }
  
  // Cargar datos al montar el componente
  onMount(async () => {
    await loadQrList();
  });
</script>

<RouteLayout title="Historial de QRs">
  <div class="qr-history-page" in:fade={{ duration: 300 }}>
    <div class="page-header">
      <h1>Historial de QRs</h1>
      <p class="page-description">Lista de todos los códigos QR generados</p>
    </div>
    
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Cargando historial...</p>
      </div>
    {:else if hasError}
      <div class="error-container">
        <div class="error-icon">!</div>
        <h3>No pudimos cargar el historial</h3>
        <p>{errorMessage}</p>
        <button class="retry-button" on:click={loadQrList}>
          Intentar nuevamente
        </button>
      </div>
    {:else if qrList.length === 0}
      <div class="empty-container">
        <QrCode size={48} />
        <h3>No hay QRs generados</h3>
        <p>Aún no has generado ningún código QR</p>
        <button class="generate-button" on:click={() => goto('/qr/generate')}>
          Generar mi primer QR
        </button>
      </div>
    {:else}
      <div class="qr-list">
        {#each qrList as qr, i (qr.id)}
          <div class="qr-item" in:fly={{ y: 20, duration: 400, delay: 100 + i * 50 }} on:click={() => viewQrStatus(qr)} on:keydown={(e) => e.key === 'Enter' && viewQrStatus(qr)} role="button" tabindex="0">
            <div class="qr-icon">
              <QrCode size={20} />
            </div>
            <div class="qr-details">
              <div class="qr-title">
                {qr.description || 'QR sin descripción'}
              </div>
              <div class="qr-meta">
                <div class="qr-date">
                  <Calendar size={12} />
                  {formatDate(qr.createdAt)}
                </div>
                {#if qr.senderName}
                  <div class="qr-payer">
                    Pagado por: {qr.senderName}
                  </div>
                {/if}
              </div>
            </div>
            <div class="qr-info">
              <div class="qr-amount">
                {getCurrencySymbol(qr.currency)} {formatCurrency(qr.amount)}
              </div>
              <div class="qr-status status-{getStatusColor(qr.status)}">
                {getStatusText(qr.status)}
              </div>
            </div>
            <div class="qr-action">
              <button class="view-button" on:click|stopPropagation={() => viewQrStatus(qr)}>
                <Eye size={16} />
              </button>
            </div>
          </div>
        {/each}
        
        {#if hasMorePages}
          <div class="load-more-container">
            <button class="load-more-button" on:click={loadMoreQrs} disabled={isLoading}>
              {isLoading ? 'Cargando...' : 'Cargar más QRs'}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</RouteLayout>

<style>
  .qr-history-page {
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
  
  .qr-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
  }
  
  .qr-item {
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
  
  .qr-item:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
    background: linear-gradient(135deg, var(--surface) 0%, rgba(0, 202, 141, 0.02) 100%);
  }
  
  .qr-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: linear-gradient(135deg, rgba(0, 202, 141, 0.15) 0%, rgba(0, 202, 141, 0.05) 100%);
    color: var(--primary-color);
    border: 1px solid rgba(0, 202, 141, 0.2);
  }
  
  .qr-details {
    flex: 1;
    min-width: 0;
  }
  
  .qr-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .qr-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .qr-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .qr-payer {
    font-size: 0.7rem;
    color: var(--success-color);
    background: rgba(0, 202, 141, 0.1);
    padding: 0.125rem 0.5rem;
    border-radius: 0.75rem;
    font-weight: 500;
  }
  
  .qr-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }
  
  .qr-amount {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }
  
  .qr-status {
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
    padding: 0.15rem 0.5rem;
    border-radius: 1rem;
  }
  
  .status-success {
    background-color: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }
  
  .status-warning {
    background-color: rgba(255, 175, 0, 0.1);
    color: #ff9800;
  }
  
  .status-error {
    background-color: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
  }
  
  .status-default {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary);
  }
  
  .qr-action {
    display: flex;
    align-items: center;
  }
  
  .view-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .view-button:hover {
    background: var(--primary-dark);
    transform: scale(1.05);
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
  
  .empty-container :global(svg) {
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  
  .empty-container h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }
  
  .empty-container p {
    margin: 0 0 1.5rem 0;
    color: var(--text-secondary);
  }
  
  .generate-button {
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
  
  .generate-button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
</style>
