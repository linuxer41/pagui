<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { 
    QrCode, 
    DollarSign, 
    FileText, 
    Check, 
    X, 
    Plus,
    Share,
    InfoIcon
  } from '@lucide/svelte';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  
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

  // Banco Economico hardcoded as the bank
  const BANCO_ECONOMICO_ID = 1;

  // Verificar autenticación
  onMount(async () => {
    if (!$auth.isAuthenticated) {
      goto('/login');
    }
  });

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
        currency: "BOB",
        dueDate: new Date(Date.now() + 10*60*1000).toISOString(), // 10 minutos
        singleUse: true,
        modifyAmount: false
      };
      
      const response = await api.generateQR(datos);
      
      if (response.responseCode === 0) {
        qrGenerado = true;
        
        // Adaptar la respuesta a nuestro formato interno
        qrData = {
          id: response.qrId || '',
          qrId: response.qrId || '',
          monto: Number(monto),
          amount: Number(monto),
          descripcion: descripcion || 'Pago QR',
          description: descripcion || 'Pago QR',
          qrImage: response.qrImage || '',
          fecha: new Date().toISOString(),
          estado: 'PENDIENTE',
          status: 'PENDIENTE',
          currency: 'BOB',
          transactionId: datos.transactionId,
          dueDate: datos.dueDate
        };
      } else {
        error = response.message || 'Error al generar QR';
      }
    } catch (err) {
      console.error('Error al generar QR:', err);
      error = 'Error de conexión. Por favor intente nuevamente más tarde.';
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
</script>

<MainPage>
  <div class="content">
    <div class="wallet-container">
      <div class="page-header">
        <h1>Generar QR</h1>
        <p class="subtitle">Crea un código QR para recibir pagos</p>
      </div>
      
      {#if error}
        <div class="alert-message error">
          <X size={16} />
          <p>{error}</p>
        </div>
      {/if}
      
      {#if qrGenerado && qrData}
        <div class="qr-display">
          <div class="qr-wrapper">
            <img src={qrImageSrc} alt="Código QR" class="qr-image" />
          </div>
          
          <div class="qr-info">
            <div class="amount-container">
              <span class="currency">BOB</span>
              <span class="amount">{qrData.monto || qrData.amount}</span>
            </div>
            <div class="description">{qrData.descripcion || qrData.description}</div>
            <div class="code-id">ID: {qrData.id || qrData.qrId}</div>
          </div>
          
          <div class="info-box">
            <InfoIcon size={16} />
            <p>Código QR de uso único, no modificable y con vencimiento de 10 minutos</p>
          </div>
          
          <div class="button-row">
            <button class="action-button share" on:click={compartirQR}>
              <Share size={20} strokeWidth={1.5} />
              <span class="button-label">Compartir</span>
            </button>
            <button class="action-button verify" on:click={verificarEstado}>
              <Check size={20} strokeWidth={1.5} />
              <span class="button-label">Verificar</span>
            </button>
            <button class="action-button cancel" on:click={cancelarQR}>
              <X size={20} strokeWidth={1.5} />
              <span class="button-label">Cancelar</span>
            </button>
          </div>
          
          <button 
            class="action-button new-qr" 
            on:click={() => {
              qrGenerado = false;
              qrData = null;
              monto = '';
              descripcion = '';
            }}
          >
            <Plus size={18} strokeWidth={1.5} />
            <span>Crear nuevo QR</span>
          </button>
        </div>
      {:else}
        <div class="form-container">
          <div class="form-group">
            <label for="monto">Monto (BOB)</label>
            <Input 
              id="monto"
              type="number"
              bind:value={monto}
              placeholder="0.00"
              icon={DollarSign}
              required
            />
          </div>
          
          <div class="form-group">
            <label for="descripcion">Descripción</label>
            <Input 
              id="descripcion"
              bind:value={descripcion}
              placeholder="Ej: Pago de servicio"
              icon={FileText}
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
  </div>
</MainPage>

<style>
  .content {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
  }
  
  .wallet-container {
    padding: 0;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    letter-spacing: -0.025em;
  }
  
  .subtitle {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
    font-weight: 500;
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
  
  .action-button.verify {
    color: var(--success-color);
  }
  
  .action-button.cancel {
    color: var(--error-color);
  }
  
  .action-button:hover {
    transform: translateY(-0.25rem);
  }
  
  .action-button.share :global(svg),
  .action-button.verify :global(svg),
  .action-button.cancel :global(svg) {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    padding: 0.875rem;
    border: 1px solid var(--border-color);
    position: relative;
    z-index: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    background: var(--surface);
    border-radius: 1rem;
    padding: 2rem 1.5rem;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    animation: slideUpForm 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
  }
  
  .info-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--primary-color);
    border-radius: 0 2px 2px 0;
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
  
  @media (max-width: 480px) {
    .content {
      padding: 1rem 0.75rem;
    }
    
    .wallet-container {
      padding: 0;
    }
    
    .page-header h1 {
      font-size: 1.75rem;
    }
    
    .qr-display {
      padding: 1.5rem 1rem;
    }
    
    .qr-wrapper {
      padding: 1rem;
    }
    
    .qr-image {
      width: 200px;
      height: 200px;
    }
    
    .amount {
      font-size: 2rem;
    }
    
    .button-row {
      gap: 0.75rem;
    }
    
    .action-button.share :global(svg),
    .action-button.verify :global(svg),
    .action-button.cancel :global(svg) {
      padding: 0.75rem;
    }
    
    .form-container {
      padding: 1.5rem 1rem;
    }
  }
</style> 