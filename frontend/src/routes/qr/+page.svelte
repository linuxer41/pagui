<script lang="ts">
  import api from '$lib/api';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  import {
      Check,
      DollarSign,
      FileText,
      InfoIcon,
      Plus,
      QrCode,
      Share,
      X
  } from '@lucide/svelte';
  
  interface QrData {
    id?: string;
    monto?: number;
    amount?: number;
    descripcion?: string;
    description?: string;
    qrImage?: string;
    qrId?: string;
    fecha?: string;
    estado?: string;
    status?: string;
    transactionId?: string;
    accountCredit?: string;
    currency?: string;
    dueDate?: string;
  }
  
  let monto = '';
  let descripcion = '';
  let loading = false;
  let error = '';
  let qrGenerado = false;
  let qrData: QrData | null = null;
  let qrImageSrc = '';
  let currency = 'BOB';

  // Banco Economico hardcoded as the bank
  const BANCO_ECONOMICO_ID = 1;

  let countdown = 600; // 10 minutos en segundos
  let countdownInterval: any;
  $: if (qrGenerado && qrData) {
    clearInterval(countdownInterval);
    countdown = Math.floor((new Date(qrData.dueDate!).getTime() - Date.now()) / 1000);
    countdownInterval = setInterval(() => {
      countdown = Math.max(0, Math.floor((new Date(qrData!.dueDate!).getTime() - Date.now()) / 1000));
      if (countdown <= 0) clearInterval(countdownInterval);
    }, 1000);
  }
  $: countdownMinutes = Math.floor(countdown / 60);
  $: countdownSeconds = countdown % 60;

  $: if (qrData && qrData.qrImage) {
    qrImageSrc = `data:image/png;base64,${qrData.qrImage}`;
  } else {
    qrImageSrc = '';
  }
  
  async function generarQR() {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      error = 'Por favor ingrese un monto válido';
      return;
    }
    
    error = '';
    loading = true;
    qrGenerado = false;
    
    try {
      // Preparar datos según el formato esperado por la API
      const datos = {
        monto: Number(monto),
        descripcion: descripcion || 'Pago QR',
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
      qrGenerado = true;
      qrData = {
        id: response.data.qrId || '',
        qrId: response.data.qrId || '',
        monto: Number(monto),
        amount: Number(monto),
        descripcion: descripcion || 'Pago QR',
        description: descripcion || 'Pago QR',
        qrImage: response.data.qrImage || '',
        fecha: new Date().toISOString(),
        estado: 'PENDIENTE',
        status: 'PENDIENTE',
        currency: currency,
        transactionId: datos.transactionId,
        dueDate: datos.dueDate
      };
    } catch (err: any) {
      error = err.message || 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }
  
  async function verificarEstado() {
    if (!qrData || !qrData.qrId) {
      error = 'No hay código QR para verificar';
      return;
    }
    
    loading = true;
    
    try {
      const response = await api.checkQRStatus(qrData.qrId);
      
      if (response.responseCode === 0) {
        let mensaje = '';
        
        switch (response.statusQrCode) {
          case 0:
            mensaje = 'El código QR está activo y pendiente de pago';
            break;
          case 1:
            mensaje = '¡El código QR ha sido pagado!';
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
  
  async function cancelarQR() {
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
      
      if (response.responseCode === 0) {
        alert('Código QR cancelado exitosamente');
        qrGenerado = false;
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

  function descargarQR() {
    if (!qrImageSrc || !qrData || !qrData.qrImage) return;
    // Crear un enlace temporal y simular click para descargar
    const link = document.createElement('a');
    link.href = qrImageSrc;
    link.download = `qr_${qrData.id || qrData.qrId || 'pago'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function compartirQR() {
    if (!qrImageSrc || !qrData || !qrData.qrImage) return;
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [] })) {
      // Compartir usando la Web Share API (solo móviles modernos)
      const byteString = atob(qrData.qrImage);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], `qr_${qrData.id || qrData.qrId || 'pago'}.png`, { type: 'image/png' });
      try {
        await navigator.share({
          files: [file],
          title: 'QR de pago',
          text: 'Escanea este QR para pagar',
        });
      } catch (e) {
        // Si el usuario cancela, no hacer nada
      }
    } else {
      // Si no soporta compartir, descargar
      descargarQR();
    }
  }

  function formatAmount(amount: number | undefined) {
    if (typeof amount !== 'number') return '';
    return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
</script>

<MainPage>
    <div class="page-container">

      
      {#if error}
        <div class="alert-message error">
          <X size={16} />
          <p>{error}</p>
        </div>
      {/if}
      
      {#if qrGenerado && qrData}
        <div class="qr-success-container">
          <div class="waiting-payment">
            <svg class="spinner" width="28" height="28" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
            <span class="waiting-text">Esperando pago...</span>
          </div>
          <div class="countdown">
            <span>Tiempo restante: {countdownMinutes}:{countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds}</span>
          </div>
          <div class="qr-wrapper-success">
            <div class="branding-inside">
              <img src="/favicon.png" alt="Pagui logo" class="logo-img" />
              <div class="branding-texts">
                <span class="app-name">Pagui</span>
                <span class="app-slogan">Pagos simples, vida feliz.</span>
              </div>
            </div>
            <img src={qrImageSrc} alt="Código QR" class="qr-image" />
            <div class="qr-info-card">
              <div class="amount-row">
                <span class="currency-chip">{qrData.currency}</span>
                <span class="amount-formatted">{formatAmount(qrData.monto || qrData.amount)}</span>
              </div>
              <div class="description-card">{qrData.descripcion || qrData.description}</div>
              <div class="tx-id-card">Mostrando ID de transacción: {qrData.transactionId}</div>
            </div>
          </div>
          <div class="button-row-minimal">
            <button class="action-button share" on:click={compartirQR}>
              <Share size={20} strokeWidth={1.5} />
              <span class="button-label">Compartir</span>
            </button>
            <button class="action-button new-qr" on:click={() => {
              qrGenerado = false;
              qrData = null;
              monto = '';
              descripcion = '';
            }}>
              <Plus size={18} strokeWidth={1.5} />
              <span>Reenviar</span>
            </button>
          </div>
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
              id="monto"
              type="number"
              bind:value={monto}
              placeholder="00.00"
              class="input-monto"
              required
            />
          </div>
          <div class="form-group">
            <input
              id="descripcion"
              type="text"
              bind:value={descripcion}
              placeholder="Descripción (opcional)"
              class="input-descripcion"
            />
          </div>
          <Button 
            variant="primary" 
            icon={QrCode} 
            on:click={generarQR}
            loading={loading}
            disabled={loading || !monto}
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
    height: 100%;
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
  
  .qr-display {
    background: var(--surface);
    border-radius: 1rem;
    padding: 2rem 1.5rem;
    box-shadow: var(--card-shadow);
    text-align: center;
    border: 1px solid var(--border-color);
    animation: slideUpQR 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  @keyframes slideUpQR {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .qr-wrapper {
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    display: inline-flex;
    margin-bottom: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
  }
  
  .qr-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(58, 102, 255, 0.05), rgba(58, 102, 255, 0.02));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .qr-wrapper:hover::before {
    opacity: 1;
  }
  
  .qr-image {
    width: 240px;
    height: 240px;
    position: relative;
    z-index: 1;
  }
  
  .qr-info {
    margin-bottom: 2rem;
  }
  
  .amount-container {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 0.75rem;
    gap: 0.25rem;
  }
  
  .currency {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
  }
  
  .amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.025em;
  }
  
  .description {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    font-weight: 500;
  }
  
  .code-id {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
    background: var(--surface-variant);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    display: inline-block;
  }
  
  .button-row {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .action-button {
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--text-secondary);
    gap: 0.75rem;
    position: relative;
    overflow: hidden;
  }
  
  .action-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(58, 102, 255, 0.1);
    border-radius: 0.75rem;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .action-button:hover::before {
    opacity: 1;
  }
  
  .action-button.share {
    color: var(--primary-color);
  }
  
  .action-button:hover {
    transform: translateY(-0.25rem);
  }
  
  
  .action-button:hover :global(svg) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .button-label {
    font-size: 0.875rem;
    font-weight: 600;
    position: relative;
    z-index: 1;
  }
  
  .action-button.new-qr {
    background: var(--primary-color);
    color: white;
    border-radius: 0.75rem;
    width: auto;
    height: auto;
    padding: 0.875rem 1.5rem;
    margin-top: 0.5rem;
    gap: 0.5rem;
    flex-direction: row;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(58, 102, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .action-button.new-qr:hover {
    background: var(--primary-dark);
    transform: translateY(-0.25rem);
    box-shadow: 0 6px 16px rgba(58, 102, 255, 0.4);
  }
  
  .action-button.new-qr :global(svg) {
    background: none !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    color: white;
  }
  
  .form-container {
    padding: var(--spacing-md);
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    place-content: center;
    height: 100%;
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
  
  .form-group label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1rem;
    letter-spacing: -0.01em;
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
    line-height: 1.5;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .info-box :global(svg) {
    color: var(--primary-color);
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

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
    font-style: italic;
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
    font-style: italic;
    text-align: center;
  }
  .qr-success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 2.5rem 0 1.5rem 0;
    background: var(--surface);
    max-height: 100vh;
    overflow-y: auto;
  }
  .branding {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .logo-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3a66ff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .app-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #3a66ff;
    letter-spacing: -0.01em;
  }
  .waiting-payment {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
  .spinner .path {
    stroke: #3a66ff;
    stroke-linecap: round;
  }
  .waiting-text {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-color);
  }
  .countdown {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-weight: 500;
  }
  .qr-wrapper-success {
    background: #fff !important;
    color: #111 !important;
    padding: 1rem 1.2rem 1.2rem 1.2rem;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
    border: 1px solid #e5e5e5;
    position: relative;
    overflow: hidden;
    max-width: 340px;
  }
  .qr-wrapper-success * {
    color: #111 !important;
  }
  .branding-inside {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    margin-bottom: 0.5rem;
    width: 100%;
  }
  .branding-texts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
  }
  .app-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #3a66ff !important;
    letter-spacing: -0.01em;
    line-height: 1.1;
  }
  .app-slogan {
    font-size: 0.92rem;
    color: #888 !important;
    font-weight: 500;
    margin-top: 0.1rem;
    line-height: 1.1;
    text-align: left;
  }
  .logo-img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: #fff;
    box-shadow: 0 1px 4px rgba(58,102,255,0.07);
  }
  .qr-info-success {
    margin-bottom: 2rem;
    text-align: center;
  }
  .qr-info-success .amount-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }
  .qr-info-success .currency {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #e8f0fe;
    color: #3a66ff !important;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 999px;
    padding: 0.15rem 0.75rem;
    margin-right: 0.25rem;
    box-shadow: 0 1px 4px rgba(58,102,255,0.07);
    letter-spacing: 0.01em;
  }
  .qr-info-success .amount {
    font-size: 2.1rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.025em;
  }
  .qr-info-success .description {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    font-weight: 500;
  }
  .qr-info-success .code-id {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
    background: var(--surface-variant);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    display: inline-block;
  }
  .button-row-minimal {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .button-row-minimal .action-button {
    border: none;
    background: #e8f0fe;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    color: #3a66ff;
    gap: 0.4rem;
    font-weight: 600;
    font-size: 0.98rem;
    border-radius: 999px;
    transition: background 0.2s, color 0.2s;
    min-height: 32px;
    min-width: 0;
    box-shadow: 0 1px 4px rgba(58,102,255,0.07);
  }
  .button-row-minimal .action-button:hover {
    background: #d2e3fc;
    color: #174ea6;
  }
  .button-row-minimal .action-button :global(svg) {
    background: none;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    margin-right: 0.2rem;
    width: 18px;
    height: 18px;
    color: inherit;
  }
  .button-row-minimal .action-button:hover :global(svg) {
    transform: scale(1.07);
    box-shadow: 0 4px 12px rgba(58, 102, 255, 0.13);
  }
  .qr-info-card {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 0.7rem;
    gap: 0.3rem;
  }
  .amount-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.1rem;
  }
  .currency-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #e8f0fe;
    color: #3a66ff !important;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 999px;
    padding: 0.12rem 0.6rem;
    box-shadow: 0 1px 4px rgba(58,102,255,0.07);
    letter-spacing: 0.01em;
  }
  .amount-formatted {
    font-size: 1.15rem;
    font-weight: 600;
    color: #111 !important;
    letter-spacing: -0.025em;
  }
  .description-card {
    font-size: 1.18rem;
    color: #444 !important;
    text-align: center;
    font-weight: 400;
    margin-bottom: 0.2rem;
    margin-top: 0.2rem;
    max-width: 95%;
    line-height: 1.5;
    padding: 0.3rem 0.1rem 0.5rem 0.1rem;
  }
  .tx-id-card {
    font-size: 0.92rem;
    color: #888 !important;
    font-weight: 400;
    margin-top: 0.1rem;
    text-align: center;
  }
  .code-id-card {
    font-size: 0.85rem;
    color: var(--text-tertiary, #8a8a8a);
    font-weight: 500;
    background: var(--surface-variant);
    padding: 0.18rem 0.7rem;
    border-radius: 0.5rem;
    display: inline-block;
    margin-top: 0.1rem;
  }
</style> 