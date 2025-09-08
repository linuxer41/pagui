<script lang="ts">
  import api, { type QRStatusResponse, type QRPaymentsResponse } from '$lib/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import {
      CheckCircle,
      Clock,
      RefreshCw,
      Loader,
      X,
      QrCode
  } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';

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
  let qrData: QRStatusResponse | null = null;
  let qrPayments: any[] = []; // Pagos separados del QR
  let loading = true;
  let checkingQR = false;
  let error = '';
  let verifyingQR = false;
  let countdown = 600; // 10 minutos en segundos
  let countdownInterval: any;
  let statusCheckInterval: any;
  let statusCheckAttempts = 0;
  let maxStatusChecks = 30;
  let paymentStatus = 'pending'; // 'pending', 'success', 'expired'
  let qrImageSrc: string | null = null;
  let isFirstLoad = true; // Para mostrar placeholders solo en la primera carga
  let showPaymentSuccessDialog = false; // Para mostrar diálogo de pago exitoso
  let paymentData: any = null; // Datos del pago exitoso

  onMount(() => {
    // Obtener el ID del QR desde la URL
    const qrIdFromUrl = page.url.searchParams.get('id');
    
    if (!qrIdFromUrl) {
      error = 'ID del QR no encontrado en la URL';
      loading = false;
      return;
    }
    
    qrId = qrIdFromUrl;
    
    // Cargar detalles iniciales del QR (imagen, información básica)
    loadQRDetails(qrId as string);
    
    // Iniciar polling automático para verificar pagos
    startPaymentsCheck();
  });

  onDestroy(() => {
    // Limpiar intervalos al destruir el componente
    stopPaymentsCheck();
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  });


  // Función para cargar los detalles del QR (imagen, información básica)
  async function loadQRDetails(qrId: string) {
    try {
      loading = true;
      error = '';
      
      const response = await api.getQRDetails(qrId);
      
      if (response.success && response.data) {
        // Procesar la imagen del QR si está disponible
        if (response.data.qrImage) {
          qrImageSrc = `data:image/png;base64,${response.data.qrImage}`;
        }
        
        // Usar la respuesta tal como llega de la API
        qrData = response.data;
        
        // Configurar countdown si es la primera carga
        if (isFirstLoad) {
          setupCountdown();
          isFirstLoad = false;
        }
      } else {
        error = response.message || 'Error cargando detalles del QR';
      }
    } catch (err: any) {
      error = err.message || 'Error de conexión';
    } finally {
      loading = false;
    }
  }


  // Función para verificar pagos del QR periódicamente
  async function checkQRPayments() {
    try {
      checkingQR = true;
      
      const response = await api.getQRPayments(qrId!);
      
      if (response.success && response.data) {
        // Actualizar solo los pagos
        qrPayments = response.data.payments;
        
        // Verificar si hay pagos exitosos
        if (qrPayments && qrPayments.length > 0) {
          // ¡QR pagado exitosamente! Mostrar diálogo de éxito
          stopPaymentsCheck();
          paymentData = qrPayments[0];
          showPaymentSuccessDialog = true;
          return;
        }
      }
    } catch (err: any) {
      // No mostrar error en verificaciones periódicas, solo log
      console.error('Error verificando pagos:', err);
    } finally {
      checkingQR = false;
    }
  }

  // Función para verificar pagos manualmente
  async function checkStatus() {
    if (!qrId) return;
    
    verifyingQR = true;
    
    try {
      await checkQRPayments();
    } catch (err) {
      console.error('Error verificando pagos:', err);
    } finally {
      verifyingQR = false;
    }
  }

  // Configurar countdown
  function setupCountdown() {
    if (!qrData?.dueDate) return;
    
    // Limpiar intervalo existente
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Calcular tiempo restante
    updateCountdown();
    
    // Configurar intervalo
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // Actualizar countdown
  function updateCountdown() {
    if (!qrData?.dueDate) return;
    
    const now = Date.now();
    const dueTime = new Date(qrData.dueDate).getTime();
    countdown = Math.max(0, Math.floor((dueTime - now) / 1000));
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      paymentStatus = 'expired';
      stopPaymentsCheck();
    }
  }

  // Iniciar verificación automática de pagos
  function startPaymentsCheck() {
    // Limpiar intervalo existente
    stopPaymentsCheck();
    
    // Reiniciar contador de intentos
    statusCheckAttempts = 0;
    
    // Iniciar verificación automática cada 3 segundos
    statusCheckInterval = setInterval(async () => {
      statusCheckAttempts++;
      
      // Verificar si hemos alcanzado el límite de intentos
      if (statusCheckAttempts >= maxStatusChecks) {
        console.log('Límite de verificaciones alcanzado');
        stopPaymentsCheck();
        return;
      }
      
      // Verificar si el QR ha expirado
      if (countdown <= 0) {
        console.log('QR expirado, deteniendo verificaciones');
        stopPaymentsCheck();
        return;
      }
      
      // Verificar solo pagos
      await checkQRPayments();
    }, 3000); // 3 segundos
  }

  // Detener verificación automática de pagos
  function stopPaymentsCheck() {
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
  function formatAmount(amount: number, currency: string) {
    const formattedAmount = new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    // Usar símbolos correctos según la moneda
    if (currency === 'BOB') {
      return `Bs. ${formattedAmount}`;
    } else if (currency === 'USD') {
      return `$${formattedAmount}`;
    } else {
      return `${formattedAmount} ${currency}`;
    }
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

   async function getQRImage() {
    const { toBlob } = await import('html-to-image');
       
        // Capturar la sección del QR
        const qrSection = document.querySelector('.qr-display-section') as HTMLElement;
       if (!qrSection) return;

       // Crear blob con html-to-image
       const blob = await toBlob(qrSection, {
         backgroundColor: '#ffffff',
         pixelRatio: 2,
         quality: 0.9,
         style: {
           transform: 'scale(1)',
           transformOrigin: 'top left'
         }
       });

       return blob;
   }

   // Función para compartir QR
   async function shareQR() {
     try {
       // Cargar html-to-image dinámicamente
       const blob = await getQRImage();

       // Verificar si Web Share API está disponible
       if (navigator.share && blob) {
         const file = new File([blob], `qr-${qrData?.transactionId || 'pagui'}.png`, {
           type: 'image/png'
         });

         await navigator.share({
           title: 'Código QR - Pagui',
           text: `Pago de ${formatAmount(qrData?.amount || 0, qrData?.currency || 'BOB')}`,
           files: [file]
         });
       } else {
         // Fallback: descargar directamente
         downloadQR();
       }
     } catch (error) {
       console.error('Error compartiendo QR:', error);
       // Fallback: descargar directamente
       downloadQR();
     }
   }

   // Función para descargar QR
   async function downloadQR() {
     try {
       const blob = await getQRImage();
       if (!blob) return;
       // Crear enlace de descarga
       const link = document.createElement('a');
       link.download = `qr-${qrData?.transactionId || 'pagui'}-${new Date().toISOString().split('T')[0]}.png`;
       link.href = URL.createObjectURL(blob);
       
       // Trigger descarga
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
     } catch (error) {
       console.error('Error descargando QR:', error);
     }
   }
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
      <!-- Placeholders bonitos para la primera carga -->
      <div class="loading-placeholder">
        <div class="placeholder-skeleton header-skeleton"></div>
        <div class="placeholder-skeleton qr-skeleton"></div>
        <div class="placeholder-skeleton info-skeleton-1"></div>
        <div class="placeholder-skeleton info-skeleton-2"></div>
        <div class="placeholder-skeleton info-skeleton-3"></div>
        <div class="placeholder-skeleton info-skeleton-4"></div>
      </div>
    {:else if qrData}
      <div class="qr-status-container">
        {#if qrData}
          <!-- Sección de estado -->
          <div class="status-section">
            <div class="status-panel">
              <div class="status-left">
                <div class="dots-loader">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
                <div class="status-info">
                  <span class="status-badge status-{qrData.status}">{qrData.status === 'active' ? 'Pendiente' : qrData.status}</span>
                </div>
              </div>
              <div class="status-right">
                <button 
                  class="verify-button" 
                  on:click={checkStatus}
                  disabled={verifyingQR}
                >
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
          </div>

          <div class="qr-display-section">
            <!-- Header con logo -->
            <div class="qr-header">
              <div class="brand-logo">
                <QrCode size={20} strokeWidth={2} />
              </div>
              <div class="brand-info">
                <div class="brand-name">Pagui</div>
                <div class="brand-tagline">Paga Rápido</div>
              </div>
            </div>
              
              <!-- Imagen del QR -->
              <div class="qr-image-container">
                {#if qrImageSrc}
                  <img src={qrImageSrc} alt="Código QR" class="qr-image" />
                {:else}
                  <div class="facebook-placeholder">
                    <div class="placeholder-skeleton qr-skeleton"></div>
                  </div>
                {/if}
              </div>
              
              
              <!-- Información destacada -->
              <div class="qr-highlight-info">
                <div class="amount-value">{formatAmount(qrData.amount, qrData.currency)}</div>
                <div class="concept-value">{qrData.description || 'Sin descripción'}</div>
              </div>
              
            <!-- Detalles técnicos -->
            <div class="qr-details">
              <div class="details-grid">
                <div class="detail-chip">
                  <span class="chip-label">ID Transacción</span>
                  <span class="chip-value">{qrData.transactionId}</span>
                </div>
                <div class="detail-chip">
                  <span class="chip-label">Vence</span>
                  <span class="chip-value">{formatDateTime(qrData.dueDate)}</span>
                </div>
                <div class="toggle-item">
                  <span class="toggle-label">Uso único</span>
                  <div class="toggle-switch {qrData.singleUse ? 'active' : 'inactive'}">
                    <div class="toggle-slider"></div>
                  </div>
                </div>
                <div class="toggle-item">
                  <span class="toggle-label">Modificar monto</span>
                  <div class="toggle-switch {qrData.modifyAmount ? 'active' : 'inactive'}">
                    <div class="toggle-slider"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="qr-actions">
              <button class="action-button share-button" on:click={shareQR}>
                Compartir
              </button>
              
              <button class="action-button download-button" on:click={downloadQR}>
                Descargar
              </button>
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
                <span class="detail-value">{formatAmount(qrData.amount, qrData.currency)}</span>
              </div>
              {#if qrData.description}
              <div class="detail-row">
                <span class="detail-label">Descripción:</span>
                <span class="detail-value">{qrData.description}</span>
              </div>
              {/if}
              <div class="detail-row">
                <span class="detail-label">ID Transacción:</span>
                <span class="detail-value">{qrData.transactionId}</span>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="new-qr-button" on:click={() => goto('/qr/generate')}>
                Generar Nuevo QR
              </button>
            </div>
          </div>
         {:else}
           <!-- Sección de pagos -->
           <div class="payments-section">
             <h3>Pagos</h3>
             {#if qrPayments && qrPayments.length > 0}
               <div class="payments-list">
                 {#each qrPayments as payment, index}
                   <div class="payment-item">
                     <div class="payment-header">
                       <span class="payment-number">Pago #{index + 1}</span>
                       <span class="payment-amount">{payment.currency} {payment.amount.toFixed(2)}</span>
                     </div>
                     <div class="payment-details">
                       <div class="payment-detail">
                         <span class="label">Pagado por:</span>
                         <span class="value">{payment.senderName || 'Usuario'}</span>
                       </div>
                       <div class="payment-detail">
                         <span class="label">Fecha:</span>
                         <span class="value">{new Date(payment.paymentDate).toLocaleString('es-BO')}</span>
                       </div>
                       <div class="payment-detail">
                         <span class="label">Transacción:</span>
                         <span class="value transaction-id">{payment.transactionId}</span>
                       </div>
                     </div>
                   </div>
                 {/each}
               </div>
             {:else}
               <div class="no-payments-message">
                 <p>Aquí aparecerán los pagos que se realicen</p>
               </div>
             {/if}
           </div>
         {/if}
      </div>
    {/if}
  </div>

  <!-- Modal de Pago Exitoso -->
  <Modal 
    open={showPaymentSuccessDialog && paymentData} 
    title="¡Pago Recibido!" 
    on:close={() => showPaymentSuccessDialog = false}
    maxWidth="500px"
  >
    <div class="payment-success-content">
      <div class="success-icon">
        <CheckCircle size={48} />
      </div>
      <p class="success-message">Has recibido un pago exitosamente</p>
      
      <div class="payment-details">
        <div class="detail-row">
          <span class="label">Monto:</span>
          <span class="value">{formatAmount(paymentData?.amount || 0, paymentData?.currency || 'BOB')}</span>
        </div>
        <div class="detail-row">
          <span class="label">Pagado por:</span>
          <span class="value">{paymentData?.senderName || 'Usuario'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Fecha:</span>
          <span class="value">{paymentData?.paymentDate ? new Date(paymentData.paymentDate).toLocaleString('es-BO') : 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">ID de Transacción:</span>
          <span class="value transaction-id">{paymentData?.transactionId || 'N/A'}</span>
        </div>
      </div>
    </div>
    
  </Modal>
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

  /* Estilos para placeholders con efecto shimmer */
  .placeholder-shimmer {
    background: linear-gradient(90deg, 
      var(--card-background) 25%, 
      rgba(255, 255, 255, 0.1) 50%, 
      var(--card-background) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }

  .placeholder-text {
    color: transparent;
    user-select: none;
  }

  /* Loading placeholder estilo apps modernas */
  .loading-placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    max-width: 400px;
    margin: 0 auto;
  }

  .placeholder-skeleton {
    background: var(--border-color);
    border-radius: var(--border-radius);
    position: relative;
    overflow: hidden;
  }

  .placeholder-skeleton::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  .header-skeleton {
    width: 100%;
    height: 40px;
    margin-bottom: var(--spacing-md);
  }

  .qr-skeleton {
    width: 200px;
    height: 200px;
    margin: 0 auto;
    border-radius: var(--border-radius-lg);
  }

  .info-skeleton-1 {
    width: 80%;
    height: 24px;
    margin: 0 auto;
  }

  .info-skeleton-2 {
    width: 60%;
    height: 20px;
    margin: 0 auto;
  }

  .info-skeleton-3 {
    width: 70%;
    height: 20px;
    margin: 0 auto;
  }

  .info-skeleton-4 {
    width: 50%;
    height: 20px;
    margin: 0 auto;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .qr-status-container {
    text-align: center;
  }

  .status-header {
    margin-bottom: var(--spacing-xl);
  }


  .status-section {
    margin-bottom: var(--spacing-lg);
  }

  .status-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
  }

   .status-left {
     display: flex;
     align-items: center;
     gap: var(--spacing-md);
   }

   .status-info {
     display: flex;
     align-items: center;
   }

   .status-badge {
     font-size: 0.8rem;
     font-weight: 600;
     padding: 2px 8px;
     border-radius: 12px;
     text-transform: uppercase;
     letter-spacing: 0.5px;
   }

   .status-badge.status-active {
     background: rgba(245, 158, 11, 0.1);
     color: var(--warning-color);
   }

   .status-badge.status-paid {
     background: rgba(16, 185, 129, 0.1);
     color: var(--success-color);
   }

   .status-badge.status-expired {
     background: rgba(239, 68, 68, 0.1);
     color: var(--error-color);
   }

   .status-badge.status-cancelled {
     background: rgba(107, 114, 128, 0.1);
     color: var(--text-secondary);
   }

  .dots-loader {
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
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

  .status-text {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .status-right {
    display: flex;
    align-items: center;
  }

  .verify-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: transparent;
    color: var(--primary-color);
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .verify-button:hover:not(:disabled) {
    background: var(--background-secondary);
    color: var(--primary-hover);
  }

  .verify-button:active:not(:disabled) {
    background: var(--background-primary);
  }

  .verify-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: var(--text-secondary);
  }

  .spinning-loader {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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


  .spinning-loader {
    animation: spin 1s linear infinite;
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
     padding: var(--spacing-xl);
     background: var(--surface);
     border-radius: var(--border-radius-lg);
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
     text-align: center;
   }


  .qr-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
  }

  .brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--primary-color);
    border-radius: var(--border-radius-sm);
    color: white;
    flex-shrink: 0;
  }

  .brand-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }


  .brand-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0;
    text-align: left;
  }

  .brand-tagline {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    text-align: left;
  }


  .qr-image-container {
    margin: var(--spacing-lg) 0;
    display: flex;
    justify-content: center;
  }

  .qr-image {
    width: 320px;
    height: 320px;
    background: white;
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--border-color);
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }


  .qr-highlight-info {
    margin: var(--spacing-md) 0;
    text-align: center;
  }

  .amount-value {
    font-weight: 600;
    color: var(--primary-color);
    font-size: 1.4rem;
    margin-bottom: var(--spacing-xs);
    line-height: 1.1;
  }

  .concept-value {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.9rem;
    word-break: break-word;
    line-height: 1.3;
  }


   /* Detalles compactos y minimalistas */
   .qr-details {
     margin-top: var(--spacing-md);
     padding-top: var(--spacing-md);
   }

   .details-grid {
     display: grid;
     grid-template-columns: 1fr 1fr;
     gap: var(--spacing-xs);
   }


   .detail-chip {
     display: flex;
     flex-direction: column;
     align-items: center;
     padding: var(--spacing-xs);
     background: var(--background-secondary);
     border-radius: var(--border-radius-sm);
     text-align: center;
     gap: 2px;
   }

   .chip-label {
     font-size: 0.65rem;
     font-weight: 500;
     color: var(--text-secondary);
     text-transform: uppercase;
     letter-spacing: 0.3px;
   }

   .chip-value {
     font-size: 0.7rem;
     font-weight: 600;
     color: var(--text-primary);
     word-break: break-all;
     line-height: 1.1;
   }


   .toggle-item {
     display: flex;
     flex-direction: column;
     align-items: center;
     padding: var(--spacing-xs);
     background: var(--background-secondary);
     border-radius: var(--border-radius-sm);
     text-align: center;
     gap: 2px;
   }

   .toggle-label {
     font-size: 0.65rem;
     font-weight: 500;
     color: var(--text-secondary);
     text-transform: uppercase;
     letter-spacing: 0.3px;
   }


   .toggle-switch {
     position: relative;
     width: 28px;
     height: 16px;
     background: var(--border-color);
     border-radius: 8px;
     transition: all 0.2s ease;
   }

   .toggle-switch.active {
     background: var(--success-color);
   }

   .toggle-switch.inactive {
     background: var(--border-color);
   }

   .toggle-slider {
     position: absolute;
     top: 2px;
     left: 2px;
     width: 12px;
     height: 12px;
     background: white;
     border-radius: 50%;
     transition: all 0.2s ease;
   }

   .toggle-switch.active .toggle-slider {
     transform: translateX(12px);
   }

   /* Botones de acción */
   .qr-actions {
     display: flex;
     gap: var(--spacing-sm);
     margin-top: var(--spacing-lg);
     padding-top: var(--spacing-md);
     border-top: 1px solid var(--border-color);
   }

   .action-button {
     flex: 1;
     display: flex;
     align-items: center;
     justify-content: center;
     padding: var(--spacing-sm) var(--spacing-md);
     border: none;
     border-radius: var(--border-radius-md);
     font-size: 0.9rem;
     font-weight: 600;
     cursor: pointer;
     transition: all 0.2s ease;
     text-decoration: none;
   }

   .share-button {
     background: var(--primary-color);
     color: white;
   }

   .share-button:hover {
     background: var(--primary-hover);
     transform: translateY(-1px);
   }

   .download-button {
     background: var(--background-secondary);
     color: var(--text-primary);
     border: 1px solid var(--border-color);
   }

   .download-button:hover {
     background: var(--background-primary);
     transform: translateY(-1px);
   }







  .status-active {
    color: var(--warning-color) !important;
  }

  .status-paid {
    color: var(--success-color) !important;
  }

  .status-expired {
    color: var(--error-color) !important;
  }

  .status-cancelled {
    color: var(--text-secondary) !important;
  }

  /* Estilos para la sección de pagos */
  .payments-section {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .payments-section h3 {
    margin: 0 0 var(--spacing-lg);
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    text-align: center;
  }

  .payments-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .payment-item {
    padding: var(--spacing-md);
    background: var(--background-secondary);
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
  }

  .payment-number {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .payment-amount {
    font-weight: 700;
    color: var(--success-color);
    font-size: 1.1rem;
  }

  .payment-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .payment-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .payment-detail .label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .payment-detail .value {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.85rem;
    text-align: right;
    max-width: 60%;
    word-break: break-all;
  }

   .transaction-id {
     font-family: 'Courier New', monospace;
     font-size: 0.8rem;
     background: var(--background-primary);
     padding: 2px 6px;
     border-radius: 4px;
     border: 1px solid var(--border-color);
   }

   .no-payments-message {
     text-align: center;
     padding: var(--spacing-xl);
     color: var(--text-secondary);
   }

  .no-payments-message p {
    margin: 0;
    font-size: 1rem;
    font-style: italic;
  }

  /* Estilos para el modal de pago exitoso */
  .payment-success-content {
    text-align: center;
  }

  .success-icon {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
    color: var(--success-color);
  }

  .success-message {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
  }

  .payment-details {
    text-align: left;
    background: var(--background-secondary);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .payment-details .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .payment-details .detail-row:last-child {
    border-bottom: none;
  }

  .payment-details .label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .payment-details .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .payment-details .transaction-id {
    font-family: monospace;
    font-size: 0.9rem;
  }


  @media (max-width: 768px) {
    .page-container {
      padding: 0 var(--spacing-sm);
    }


    .countdown {
      font-size: 1.5rem;
    }

    .status-section {
      margin-bottom: var(--spacing-md);
    }

    .status-panel {
      gap: var(--spacing-sm);
    }

    .verify-button {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.8rem;
    }


    .qr-image {
      width: 180px;
      height: 180px;
    }

    .loading-placeholder {
      max-width: 320px;
      padding: var(--spacing-md);
    }

    .header-skeleton {
      height: 32px;
    }

    .qr-skeleton {
      width: 160px;
      height: 160px;
    }

    .info-skeleton-1 {
      height: 20px;
    }

    .info-skeleton-2,
    .info-skeleton-3,
    .info-skeleton-4 {
      height: 18px;
    }

    .amount-value {
      font-size: 1.5rem;
    }

     .concept-value {
       font-size: 1rem;
     }

     .detail-chips {
       gap: 2px;
     }

     .detail-chip {
       padding: 4px 0;
     }

     .toggle-item {
       padding: 4px 0;
     }

     .toggle-switch {
       width: 32px;
       height: 18px;
     }

     .toggle-slider {
       width: 14px;
       height: 14px;
     }

     .toggle-switch.active .toggle-slider {
       transform: translateX(14px);
     }

     .status-info {
       justify-content: flex-start;
     }

     .qr-actions {
       gap: var(--spacing-xs);
       margin-top: var(--spacing-md);
       padding-top: var(--spacing-sm);
     }

     .action-button {
       padding: var(--spacing-xs) var(--spacing-sm);
       font-size: 0.8rem;
     }

     .details-grid {
       grid-template-columns: 1fr 1fr;
       gap: 4px;
     }

     .detail-chip,
     .toggle-item {
       padding: 6px;
     }

     .toggle-switch {
       width: 24px;
       height: 14px;
     }

     .toggle-slider {
       width: 10px;
       height: 10px;
     }

     .toggle-switch.active .toggle-slider {
       transform: translateX(10px);
     }

     .qr-header {
       gap: 6px;
       margin-bottom: var(--spacing-sm);
     }

     .brand-logo {
       width: 28px;
       height: 28px;
     }

     .brand-name {
       font-size: 0.9rem;
     }

     .brand-tagline {
       font-size: 0.7rem;
     }

     .amount-value {
       font-size: 1.2rem;
     }

     .concept-value {
       font-size: 0.8rem;
     }


    .payments-section {
      padding: var(--spacing-md);
    }

    .payment-item {
      padding: var(--spacing-sm);
    }
  }



</style>
