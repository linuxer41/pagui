<script lang="ts">
  import api from '$lib/api';
  import Button from '$lib/components/Button.svelte';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  import {
      CheckCircle,
      Clock,
      Download,
      InfoIcon,
      Loader,
      QrCode,
      RefreshCw,
      Share,
      X
  } from '@lucide/svelte';
  import * as htmlToImage from 'html-to-image';
  import { onMount } from 'svelte';
  
  interface QrData {
    id: string;
    qrId: string;
    amount: number;
    description: string;
    currency: string;
    transactionId: string;
    qrCode: string;
    dueDate?: string;
    // Nuevos campos para la información del remitente
    senderName?: string;
    senderBank?: string;
  }
  
  let amount = '';
  let description = '';
  let loading = false;
  let error = '';
  let qrGenerated = false;
  let qrData: QrData | null = null;
  let qrImageSrc = '';
  let currency = 'BOB';
  let amountInput: HTMLInputElement | undefined;
  let countdown = 600; // 10 minutos en segundos
  let countdownInterval: any;
  let paymentStatus = 'pending'; // 'pending', 'success', 'expired'

  // Banco Economico hardcoded as the bank
  const BANCO_ECONOMICO_ID = 1;

  // Para demostración
  const DEMO_SENDER_NAME = "Juan Pérez";
  const DEMO_SENDER_BANK = "Banco Económico";

  // Función para calcular el tiempo restante
  function updateCountdown() {
    if (!qrData || !qrData.dueDate) return;
    
    const now = Date.now();
    const dueTime = new Date(qrData.dueDate).getTime();
    countdown = Math.max(0, Math.floor((dueTime - now) / 1000));
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      paymentStatus = 'expired';
    }
  }

  $: if (qrGenerated && qrData && qrData.dueDate) {
    // Limpiar cualquier intervalo existente
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Configurar inmediatamente el valor inicial del contador
    updateCountdown();
    
    // Configurar el intervalo para actualizar cada segundo
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  $: if (qrData && qrData.qrCode) {
    qrImageSrc = `data:image/png;base64,${qrData.qrCode}`;
  } else {
    qrImageSrc = '';
  }

  $: if (countdown <= 0 && paymentStatus === 'pending') {
    paymentStatus = 'expired';
  }

  async function generateQR() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      error = 'Por favor ingrese un monto válido';
      return;
    }

    loading = true;
    error = '';
    
    try {
      // Preparar datos según el formato esperado por la API
      const datos = {
        amount: Number(amount),
        description: description,
        bankId: BANCO_ECONOMICO_ID, // Banco Economico
        transactionId: `TX-${Date.now()}`,
        accountNumber: "12345678", // Este valor debería venir de la configuración de la empresa
        currency: currency,
        dueDate: new Date(Date.now() + 10*60*1000).toISOString(), // 10 minutos
        singleUse: true,
        modifyAmount: false
      };
      
      const response = await api.generateQR(datos);

      if (!response.success) {
        throw new Error(response.message || 'Error al generar QR');
      }
      qrGenerated = true;
      qrData = {
        id: response.data.qrId || '',
        qrId: response.data.qrId || '',
        amount: Number(amount),
        description: description,
        currency: currency,
        transactionId: datos.transactionId,
        qrCode: response.data.qrImage || '',
      };
      
      // Iniciar countdown timer (10 minutos)
      countdown = 600;
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) clearInterval(countdownInterval);
      }, 1000);
    } catch (err: any) {
      error = err.message || 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }
  
  async function checkStatus() {
    if (!qrData || !qrData.qrId) {
      error = 'No hay código QR para verificar';
      return;
    }
    
    loading = true;
    
    try {
      const response = await api.checkQRStatus(qrData.qrId);
      
      if (response.success) {
        let mensaje = '';
        
        switch (response.data.statusQrCode) {
          case 0:
            mensaje = 'El código QR está activo y pendiente de pago';
            break;
          case 1:
            mensaje = '¡El código QR ha sido pagado!';
            paymentStatus = 'success';
            // Simular datos del remitente (en producción vendrían de la API)
            qrData.senderName = DEMO_SENDER_NAME;
            qrData.senderBank = DEMO_SENDER_BANK;
            break;
          case 9:
            mensaje = 'El código QR ha sido cancelado';
            break;
          default:
            mensaje = 'Estado desconocido';
        }
        
        alert(mensaje);
      } else {
        error = response.message || 'Error al verificar el estado del QR';
      }
    } catch (err) {
      console.error('Error al verificar estado:', err);
      error = 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }
  
  async function cancelQR() {
    if (!qrData || !qrData.qrId) {
      error = 'No hay código QR para cancelar';
      return;
    }
    
    if (!confirm('¿Está seguro que desea cancelar este código QR?')) {
      return;
    }
    
    loading = true;
    
    try {
      const response = await api.cancelQR(qrData.qrId);
      
      if (response.success) {
        alert('Código QR cancelado exitosamente');
        qrGenerated = false;
        qrData = null;
      } else {
        error = response.message || 'Error al cancelar el QR';
      }
    } catch (err) {
      console.error('Error al cancelar QR:', err);
      error = 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }

  async function shareQR() {
    const qrNode = document.getElementById('qr-export-area');
    if (!qrNode) return;
    
    try {
      // Convertir el HTML del QR a imagen usando html-to-image
      const dataUrl = await htmlToImage.toPng(qrNode);
      
      // Verificar si el navegador soporta Web Share API con archivos
      const canShareFiles = navigator.canShare && 
                           navigator.canShare({ files: [new File([], 'test.png')] });
      
      if (canShareFiles) {
        // Convertir dataUrl a blob y crear archivo para compartir
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `qr_${qrData?.id || qrData?.qrId || 'pago'}.png`, { type: 'image/png' });
        
        try {
          await navigator.share({
            files: [file],
            title: 'Código QR de pago',
            text: `Paga escaneando este QR. Monto: ${formatAmount(qrData?.amount)} ${qrData?.currency}. Descripción: ${qrData?.description}`,
          });
        } catch (e) {
          // Si el usuario cancela, no hacer nada
          console.log('Usuario canceló el compartir');
        }
      } else {
        // Fallback: intentar compartir solo con URL
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Código QR de pago',
              text: `Paga escaneando este QR. Monto: ${formatAmount(qrData?.amount)} ${qrData?.currency}. Descripción: ${qrData?.description}`,
              url: dataUrl
            });
          } catch (e) {
            console.log('Usuario canceló el compartir');
          }
        } else {
          // Si no soporta Web Share API, descargar la imagen
          const link = document.createElement('a');
          link.download = `qr_${qrData?.id || qrData?.qrId || 'pago'}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (error) {
      console.error('Error al compartir QR:', error);
      alert('Error al compartir la imagen');
    }
  }

  function formatAmount(amount: number | undefined) {
    if (typeof amount !== 'number') return '';
    return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  onMount(() => {
    amountInput?.focus();
    
    // Limpiar intervalo al desmontar el componente
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  async function downloadQRAsImage() {
    const qrNode = document.getElementById('qr-export-area');
    if (!qrNode) return;
    
    try {
      // Convertir el HTML del QR a imagen usando html-to-image
      const dataUrl = await htmlToImage.toPng(qrNode);
      
      // Descargar la imagen
      const link = document.createElement('a');
      link.download = `qr_${qrData?.id || qrData?.qrId || 'pago'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error al descargar el QR:', error);
    }
  }

  function getCurrencySymbol(currency: string) {
    if (currency === 'BOB') return 'Bs.';
    if (currency === 'USD') return '$';
    return currency;
  }
</script>

<MainPage>
    <div class="page-container">

      
      {#if error}
        <div class="alert-message error">
          <button class="close-button" on:click={() => error = ''}>
            <X size={16} />
          </button>
          <p>{error}</p>
        </div>
      {/if}
      
      {#if qrGenerated && qrData}
        <div class="qr-success-container">
          {#if paymentStatus === 'success'}
            <div class="status-card success">
              <div class="icon-container">
                <CheckCircle size={64} strokeWidth={2} />
              </div>
              <h2 class="status-title">¡Pago completado!</h2>
              <p class="status-message">El pago ha sido procesado exitosamente</p>
              
              <div class="transaction-details">
                <div class="detail-row">
                  <span class="detail-label">Monto:</span>
                  <span class="detail-value">{formatAmount(qrData?.amount)} {qrData?.currency}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Descripción:</span>
                  <span class="detail-value">{qrData?.description}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ID Transacción:</span>
                  <span class="detail-value">{qrData?.transactionId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Remitente:</span>
                  <span class="detail-value">{qrData?.senderName || 'No especificado'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Banco:</span>
                  <span class="detail-value">{qrData?.senderBank || 'No especificado'}</span>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="action-button success" on:click={() => window.location.reload()}>
                <RefreshCw size={20} strokeWidth={2} />
                <span>Nuevo Pago</span>
              </button>
            </div>

          {:else if paymentStatus === 'expired'}
            <div class="status-card expired">
              <div class="icon-container">
                <Clock size={64} strokeWidth={2} />
              </div>
              <h2 class="status-title">QR Expirado</h2>
              <p class="status-message">El código QR ha expirado, por favor genera uno nuevo</p>
              
              <div class="transaction-details">
                <div class="detail-row">
                  <span class="detail-label">Monto:</span>
                  <span class="detail-value">{formatAmount(qrData?.amount)} {qrData?.currency}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Descripción:</span>
                  <span class="detail-value">{qrData?.description}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ID Transacción:</span>
                  <span class="detail-value">{qrData?.transactionId}</span>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="action-button expired" on:click={() => window.location.reload()}>
                <RefreshCw size={20} strokeWidth={2} />
                <span>Nuevo QR</span>
              </button>
            </div>

          {:else}
            <div class="status-section pending">
              <div class="status-indicator">
                <div class="loader-container">
                  <Loader size={32} strokeWidth={2} class="spinning-loader" />
                </div>
                <span>Esperando pago</span>
              </div>
              <div class="countdown">Expira en: {formatTime(countdown)}</div>
            </div>
            
            <div class="qr-card" id="qr-export-area">
              <div class="qr-header">
                <div class="logo-section">
                  <!-- <img src="/favicon.png" alt="Logo" class="logo-img" /> -->
                  <div class="brand-info">
                    <div class="brand-name">Pagui</div>
                    <div class="brand-slogan">Automatiza tus cobros</div>
                  </div>
                </div>
              </div>
              <img src={qrImageSrc} alt="Código QR" class="qr-image" />
              <div class="qr-info-card">
                <div class="amount-row">
                  <span class="amount-formatted">{getCurrencySymbol(qrData?.currency)} {formatAmount(qrData?.amount)}</span>
                </div>
                
                <div class="description-card">{qrData?.description || 'Sin descripción'}</div>
                <div class="tx-id-card">ID: {qrData?.transactionId}</div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="action-button primary" on:click={shareQR}>
                <Share size={20} strokeWidth={2} />
                <span>Compartir</span>
              </button>
              <button class="action-button secondary" on:click={downloadQRAsImage}>
                <Download size={20} strokeWidth={2} />
                <span>Descargar</span>
              </button>
              <button class="action-button secondary" on:click={checkStatus}>
                <RefreshCw size={20} strokeWidth={2} />
                <span>Verificar</span>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="form-container centered-form">
          <div class="form-group">
            <div class="currency-selector-row">
              <select class="currency-selector" bind:value={currency}>
                <option value="BOB">BOB</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input
              id="amount"
              type="number"
              bind:value={amount}
              placeholder="00.00"
              class="input-monto"
              required
            />
          </div>
          <div class="form-group">
            <input
              id="description"
              type="text"
              bind:value={description}
              placeholder="Descripción (opcional)"
              class="input-descripcion"
            />
          </div>
          <Button 
            variant="primary" 
            icon={QrCode} 
            on:click={generateQR}
            loading={loading}
            disabled={loading || !amount}
            fullWidth
          >
            {loading ? 'Generando...' : 'Generar QR'}
          </Button>
          <div class="info-box">
            <InfoIcon size={16} />
            <p>Configuración automática: QR de uso único, no modificable, con vencimiento de 10 minutos</p>
          </div>
        </div>
      {/if}
    </div>
</MainPage>

<style>
  .page-container {
    width: 100%;
    min-height: 100%;
    display: grid;
  }
  .alert-message {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
    gap: 0.75rem;
    background: var(--error-bg);
    color: var(--error-color);
    border: 1px solid rgba(233, 58, 74, 0.2);
    box-shadow: 0 2px 8px rgba(233, 58, 74, 0.1);
  }
  
  .alert-message.error {
    background: var(--error-bg);
    color: var(--error-color);
    border-color: rgba(233, 58, 74, 0.2);
  }
  
  .alert-message p {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .qr-image {
    width: 350px;
    height: 350px;
    margin: 0 auto;
    display: block;
    border-radius: 0.75rem;
  }
  
  .form-container {
    padding: var(--spacing-md);
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    place-content: center;
    min-height: 100%;
  }
  
  @keyframes slideUpForm {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: var(--surface-variant);
    border-radius: 0.75rem;
    padding: 1rem;
    margin: 1.5rem 0;
    text-align: left;
    font-size: 0.875rem;
    color: var(--text-secondary);
    position: relative;
    overflow: hidden;
  }
  
  .info-box p {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .info-box :global(svg) {
    color: var(--primary-color);
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  /* Estilos para el formulario */
  .centered-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .form-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .currency-selector-row {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
  .currency-selector {
    font-size: 1rem;
    font-weight: 600;
    border: none;
    background: var(--surface-variant);
    color: var(--primary-color);
    border-radius: 0.5rem;
    padding: 0.25rem 1.25rem;
    outline: none;
    margin-bottom: 0.25rem;
    box-shadow: 0 1px 4px rgba(58,102,255,0.07);
    transition: box-shadow 0.2s;
  }
  .currency-selector:focus {
    box-shadow: 0 0 0 2px var(--primary-color);
  }
  .input-monto {
    width: 100%;
    max-width: 320px;
    font-size: 2rem;
    font-weight: 700;
    border: none;
    outline: none;
    background: none;
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    box-shadow: none;
    border-radius: 0;
    text-align: center;
    transition: border-bottom 0.2s, color 0.2s;
    border-bottom: 2px solid transparent;
  }
  .input-monto:focus {
    border-bottom: 2px solid var(--primary-color);
    color: var(--primary-color);
  }
  .input-monto::placeholder {
    color: var(--text-secondary);
    opacity: 1;
    font-size: 2rem;
    font-weight: 400;
    text-align: center;
  }
  .input-descripcion {
    width: 100%;
    max-width: 320px;
    font-size: 0.9rem;
    border: none;
    outline: none;
    background: none;
    padding: 0.25rem 0;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
    box-shadow: none;
    border-radius: 0;
    text-align: center;
  }
  .input-descripcion::placeholder {
    color: var(--text-secondary);
    opacity: 1;
    font-size: 0.9rem;
    text-align: center;
  }
  
  /* Contenedor para estados de éxito/error */
  .qr-success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  
  /* Estado pendiente */
  .status-section.pending {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .status-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .loader-container {
    margin-bottom: 0.5rem;
  }
  
  .spinning-loader {
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  .countdown {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-top: 0.5rem;
    background: var(--surface-variant);
    padding: 0.5rem 1rem;
    border-radius: 1rem;
  }
  
  /* Estilos nuevos para cards de éxito y error */
  .status-card {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  .status-card.success {
    background: linear-gradient(to bottom, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.05));
    border: 1px solid rgba(52, 199, 89, 0.2);
  }
  
  .status-card.expired {
    background: linear-gradient(to bottom, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.05));
    border: 1px solid rgba(255, 152, 0, 0.2);
  }
  
  .icon-container {
    margin-bottom: 1.5rem;
  }
  
  .status-card.success .icon-container :global(svg) {
    color: #34c759;
  }
  
  .status-card.expired .icon-container :global(svg) {
    color: #ff9800;
  }
  
  .status-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }
  
  .status-card.success .status-title {
    color: #34c759;
  }
  
  .status-card.expired .status-title {
    color: #ff9800;
  }
  
  .status-message {
    font-size: 1rem;
    margin: 0 0 1.5rem 0;
    font-weight: 500;
  }
  
  /* Detalles de la transacción */
  .transaction-details {
    width: 100%;
    background-color: white;
    border-radius: 0.75rem;
    padding: 1rem;
    margin-top: 0.5rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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

  /* Botones de acción */
  .action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    min-width: 90px;
    justify-content: center;
  }

  .action-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .action-button.primary {
    background: linear-gradient(135deg, #3a66ff, #5b7cfa);
    color: white;
  }

  .action-button.primary:hover {
    background: linear-gradient(135deg, #2952cc, #4a6af5);
  }

  .action-button.secondary {
    background: white;
    color: #3a66ff;
    border: 1px solid #e0e0e0;
  }

  .action-button.secondary:hover {
    background: #f8f9ff;
    border-color: #3a66ff;
  }

  .action-button.success {
    background: linear-gradient(135deg, #34c759, #2ecc71);
    color: white;
  }

  .action-button.success:hover {
    background: linear-gradient(135deg, #2ecc71, #34c759);
  }

  .action-button.expired {
    background: linear-gradient(135deg, #ff9800, #ff5722);
    color: white;
  }

  .action-button.expired:hover {
    background: linear-gradient(135deg, #ff5722, #ff9800);
  }

  /* QR card styles */
  .qr-card {
    background: white;
    border-radius: 1rem;
    padding: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    max-width: 450px;
    margin: 0 auto;
  }

  .qr-info-card {
    text-align: center;
    padding: 0;
    margin: 0;
  }

  .amount-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .amount-formatted {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .description-card {
    font-size: 0.85rem;
    color: #444;
  }

  .tx-id-card {
    font-size: 0.65rem;
    color: #666;
    font-weight: 400;
  }

  .logo-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    gap: 0.25rem;
  }

  .logo-img {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    object-fit: cover;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .brand-info {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--primary-color);
  }

  .brand-slogan {
    font-size: 0.65rem;
    color: var(--text-secondary);
    font-weight: 400;
  }
</style> 