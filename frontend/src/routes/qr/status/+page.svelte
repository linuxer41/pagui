<script lang="ts">
  import api from '$lib/api';
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import {
      CheckCircle,
      Clock,
      RefreshCw,
      Loader,
      X
  } from '@lucide/svelte';
  import { onMount } from 'svelte';

  export let data: any;
  
  interface QrStatus {
    qrId: string;
    transactionId: string;
    createdAt: string;
    dueDate: string;
    currency: string;
    amount: number;
    status: string;
    description: string;
    accountName: string;
    singleUse: boolean;
    modifyAmount: boolean;
    payments?: Payment[];
  }

  interface Payment {
    qrId: string;
    transactionId: string;
    paymentDate: string;
    paymentTime: string;
    currency: string;
    amount: number;
    senderBankCode: string;
    senderName: string;
    senderDocumentId: string;
    senderAccount: string;
    description: string;
  }
  
  let qrId = '';
  let qrStatus: QrStatus | null = null;
  let loading = true;
  let error = '';
  let verifyingQR = false;
  let countdown = 600; // 10 minutos en segundos
  let countdownInterval: any;
  let statusCheckInterval: any;
  let statusCheckAttempts = 0;
  let maxStatusChecks = 30;
  let paymentStatus = 'pending'; // 'pending', 'success', 'expired'
  let qrImageSrc: string | null = null;

  onMount(() => {

    
    // Cargar estado inicial del QR
    loadQRStatus(data.qrId);
    
    // Iniciar polling automático
    startStatusCheck();
  });

  // Función para cargar el estado del QR
  async function loadQRStatus(qrId: string) {
    try {
      loading = true;
      error = '';
      
      const response = await api.checkQRStatus(qrId!);
      
      if (response.success) {
        qrStatus = response.data;
        
        // Verificar si hay pagos exitosos
        if (qrStatus.payments && qrStatus.payments.length > 0) {
          // ¡QR pagado exitosamente! Redirigir a la página de confirmación
          stopStatusCheck();
          
          // Guardar datos del pago en localStorage para la página de confirmación
          const paymentData = {
            qrId: qrStatus.qrId,
            transactionId: qrStatus.transactionId || '',
            createdAt: qrStatus.createdAt || '',
            dueDate: qrStatus.dueDate || '',
            currency: qrStatus.currency || '',
            amount: qrStatus.amount || 0,
            status: qrStatus.status || '',
            description: qrStatus.description || '',
            accountName: qrStatus.accountName || '',
            singleUse: qrStatus.singleUse || false,
            modifyAmount: qrStatus.modifyAmount || false,
            payments: qrStatus.payments || []
          };
          localStorage.setItem('qrPaymentData', JSON.stringify(paymentData));
          
          // Redirigir a la página de confirmación
          goto(`/qr/payment-confirmation?qrId=${qrStatus.qrId}`);
          return;
        }
        
        // Configurar countdown si hay fecha de vencimiento
        if (qrStatus.dueDate) {
          setupCountdown();
        }
      } else {
        error = response.message || 'Error cargando estado del QR';
      }
    } catch (err: any) {
      error = err.message || 'Error de conexión';
    } finally {
      loading = false;
    }
  }

  // Función para verificar estado manualmente
  async function checkStatus() {
    if (!qrId) return;
    
    verifyingQR = true;
    
    try {
      await loadQRStatus();
    } catch (err) {
      console.error('Error verificando estado:', err);
    } finally {
      verifyingQR = false;
    }
  }

  // Configurar countdown
  function setupCountdown() {
    if (!qrStatus?.dueDate) return;
    
    // Limpiar intervalo existente
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Calcular tiempo restante
    updateCountdown();
    
    // Configurar intervalo
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // Actualizar countdown
  function updateCountdown() {
    if (!qrStatus?.dueDate) return;
    
    const now = Date.now();
    const dueTime = new Date(qrStatus.dueDate).getTime();
    countdown = Math.max(0, Math.floor((dueTime - now) / 1000));
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      paymentStatus = 'expired';
      stopStatusCheck();
    }
  }

  // Iniciar verificación automática
  function startStatusCheck() {
    // Limpiar intervalo existente
    stopStatusCheck();
    
    // Reiniciar contador de intentos
    statusCheckAttempts = 0;
    
    // Iniciar verificación automática cada 10 segundos
    statusCheckInterval = setInterval(async () => {
      statusCheckAttempts++;
      
      // Verificar si hemos alcanzado el límite de intentos
      if (statusCheckAttempts >= maxStatusChecks) {
        console.log('Límite de verificaciones alcanzado');
        stopStatusCheck();
        return;
      }
      
      // Verificar si el QR ha expirado
      if (countdown <= 0) {
        console.log('QR expirado, deteniendo verificaciones');
        stopStatusCheck();
        return;
      }
      
      // Verificar estado
      await loadQRStatus();
    }, 10000); // 10 segundos
  }

  // Detener verificación automática
  function stopStatusCheck() {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      statusCheckInterval = null;
    }
  }

  // Formatear tiempo
  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Formatear monto
  function formatAmount(amount: number) {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Formatear fecha
  function formatDateTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Limpiar intervalos al desmontar
  onMount(() => {
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    };
  });
</script>

<svelte:head>
  <title>Estado del QR | Pagui</title>
</svelte:head>

<RouteLayout title="Estado del QR">
  <div class="page-container">
    {#if error}
      <div class="alert-message error">
        <button class="close-button" on:click={() => error = ''}>
          <X size={16} />
        </button>
        <p>{error}</p>
        <button class="retry-button" on:click={() => goto('/qr/generate')}>
          Generar Nuevo QR
        </button>
      </div>
    {:else if loading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Cargando estado del QR...</p>
      </div>
    {:else if qrStatus}
      <div class="qr-status-container">
        <div class="status-header">
          <h1>Monitoreando QR</h1>
          <p>ID: {qrStatus.qrId}</p>
        </div>

        {#if qrImageSrc && qrStatus}
          <div class="qr-display-section">
            <div class="qr-card">
              <div class="qr-header">
                <div class="logo-section">
                  <div class="brand-info">
                    <div class="brand-name">Pagui</div>
                    <div class="brand-tagline">Pagos Seguros</div>
                  </div>
                </div>
                <div class="amount-section">
                  <div class="amount-display">
                    {formatAmount(qrStatus.amount)} {qrStatus.currency}
                  </div>
                  {#if qrStatus.description}
                    <div class="description">{qrStatus.description}</div>
                  {/if}
                </div>
              </div>
              
              <div class="qr-code-section">
                <div class="qr-image">
                  <img src={qrImageSrc} alt="Código QR" />
                </div>
                <div class="qr-info">
                  <div class="info-item">
                    <span class="label">ID del QR:</span>
                    <span class="value">{qrStatus.qrId}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Vence:</span>
                    <span class="value">{formatDateTime(qrStatus.dueDate)}</span>
                  </div>
                  {#if qrStatus.singleUse}
                    <div class="info-item">
                      <span class="label">Uso:</span>
                      <span class="value">Un solo uso</span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}
        {#if paymentStatus === 'expired'}
          <div class="status-card expired">
            <div class="icon-container">
              <Clock size={64} strokeWidth={2} />
            </div>
            <h2 class="status-title">QR Expirado</h2>
            <p class="status-message">El código QR ha expirado, por favor genera uno nuevo</p>
            
            <div class="transaction-details">
              <div class="detail-row">
                <span class="detail-label">Monto:</span>
                <span class="detail-value">{formatAmount(qrStatus.amount)} {qrStatus.currency}</span>
              </div>
              {#if qrStatus.description}
              <div class="detail-row">
                <span class="detail-label">Descripción:</span>
                <span class="detail-value">{qrStatus.description}</span>
              </div>
              {/if}
              <div class="detail-row">
                <span class="detail-label">ID Transacción:</span>
                <span class="detail-value">{qrStatus.transactionId}</span>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="new-qr-button" on:click={() => goto('/qr/generate')}>
                Generar Nuevo QR
              </button>
            </div>
          </div>
        {:else}
          <div class="status-section pending">
            <div class="status-grid">
              <div class="status-left">
                <div class="dots-loader">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
                <div class="countdown">{formatTime(countdown)}</div>
                <p class="status-text">Esperando pago...</p>
              </div>
              <button class="verify-button" on:click={checkStatus} disabled={verifyingQR}>
                {#if verifyingQR}
                  <Loader size={16} strokeWidth={2} class="spinning-loader" />
                  <span>Verificando...</span>
                {:else}
                  <RefreshCw size={16} strokeWidth={2} />
                  <span>Verificar</span>
                {/if}
              </button>
            </div>
          </div>
          
          <div class="qr-info-card">
            <h3>Información del QR</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Monto:</span>
                <span class="value">{formatAmount(qrStatus.amount)} {qrStatus.currency}</span>
              </div>
              {#if qrStatus.description}
              <div class="info-item">
                <span class="label">Descripción:</span>
                <span class="value">{qrStatus.description}</span>
              </div>
              {/if}
              <div class="info-item">
                <span class="label">ID Transacción:</span>
                <span class="value">{qrStatus.transactionId}</span>
              </div>
              <div class="info-item">
                <span class="label">Vence:</span>
                <span class="value">{formatDateTime(qrStatus.dueDate)}</span>
              </div>
              <div class="info-item">
                <span class="label">Estado:</span>
                <span class="value status-pending">Pendiente</span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</RouteLayout>

<style>
  .page-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  .alert-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }

  .alert-message.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .close-button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--border-radius-sm);
    margin-left: auto;
    align-self: flex-end;
  }

  .retry-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .retry-button:hover {
    background: var(--primary-dark);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl) 0;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .qr-status-container {
    text-align: center;
  }

  .status-header {
    margin-bottom: var(--spacing-xl);
  }

  .status-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
  }

  .status-header p {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0;
    font-family: monospace;
  }

  .status-section.pending {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .status-grid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .status-left {
    text-align: center;
  }

  .dots-loader {
    display: flex;
    gap: var(--spacing-xs);
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .countdown {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: var(--spacing-sm);
    font-family: monospace;
  }

  .status-text {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .verify-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: var(--primary-color);
    color: white;
    border: none;
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .verify-button:hover:not(:disabled) {
    background: var(--primary-dark);
  }

  .verify-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning-loader {
    animation: spin 1s linear infinite;
  }

  .qr-info-card {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .qr-info-card h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-lg);
    color: var(--text-primary);
    text-align: center;
  }

  .info-grid {
    display: grid;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item .label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .info-item .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-pending {
    color: var(--warning-color, #f59e0b);
  }

  .status-card {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    text-align: center;
  }

  .status-card.expired {
    border: 2px solid var(--error-color, #ef4444);
  }

  .icon-container {
    margin-bottom: var(--spacing-lg);
  }

  .status-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
  }

  .status-message {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-lg);
  }

  .transaction-details {
    text-align: left;
    max-width: 400px;
    margin: 0 auto var(--spacing-lg);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .detail-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .action-buttons {
    display: flex;
    justify-content: center;
  }

  .new-qr-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .new-qr-button:hover {
    background: var(--primary-dark);
  }

  .qr-display-section {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .qr-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .qr-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .brand-info {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .brand-tagline {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .amount-section {
    text-align: right;
  }

  .amount-display {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color);
  }

  .description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .qr-code-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .qr-image {
    width: 200px;
    height: 200px;
    background: var(--surface);
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .qr-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .qr-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: left;
    max-width: 300px;
    margin: 0 auto;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item .label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .info-item .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 0 var(--spacing-sm);
    }

    .status-header h1 {
      font-size: 1.75rem;
    }

    .countdown {
      font-size: 1.5rem;
    }

    .status-section.pending {
      padding: var(--spacing-lg);
    }

    .qr-info-card {
      padding: var(--spacing-md);
    }

    .qr-image {
      width: 150px;
      height: 150px;
    }
  }
</style>
