<script lang="ts">
  import { DownloadIcon, Share2Icon, CheckCircleIcon } from 'svelte-feather-icons';
  import type { QRGenerationData, QRStatusData } from '$lib/types/api';
  
  interface Deuda {
    id?: string | number;
    cuf?: string;
    monto: number;
    descripcion: string;
    fecha: string | Date;
    estado: string;
    numeroCuenta?: string | number;
    volumenConsumo?: number;
    tipo?: 'agua' | 'servicio';
    nombreCliente?: string;
    idServicio?: number;
  }

  export let qrGenerado: QRGenerationData | null = null;
  export let qrStatus: QRStatusData | null = null;
  export let deuda: Deuda;
  export let pollingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Funciones que se propagarán desde el padre
  export let descargarQR: (qrImage: string, qrId: string) => Promise<void> = async () => {};
  export let compartirQR: (qrImage: string, qrId: string) => Promise<void> = async () => {};
  export let goToPreviousStep: () => void = () => {};
  
  // ID de transacción para asociar QR a deuda específica
  $: transactionId = deuda ? `txn_${deuda.numeroCuenta || ''}_${deuda.monto}` : '';
  
  // Indica si este componente debe mostrar el QR
  // Simplificado: mostrar el QR si existe, sin comparar transactionId
  $: mostrarQR = qrGenerado && qrGenerado.qrImage;
</script>

{#if mostrarQR && qrGenerado && qrGenerado.qrImage}
  <!-- Elemento oculto solo para descarga - minimalista -->
  <div class="qr-download-only">
    <div class="qr-download-header">
      <h3>QR de Pago</h3>
    </div>
    <img 
      src="data:image/png;base64,{qrGenerado.qrImage}" 
      alt="QR para pago" 
      class="qr-image"
      width="300" 
      height="300"
    />
    <div class="qr-download-details">
      <div class="qr-download-item">
        <span class="download-label">Monto:</span>
        <span class="download-value">Bs. {qrGenerado.amount}</span>
      </div>
      <div class="qr-download-item">
        <span class="download-label">Descripción:</span>
        <span class="download-value">{deuda?.descripcion}</span>
      </div>
      {#if deuda?.volumenConsumo}
        <div class="qr-download-item">
          <span class="download-label">Consumo:</span>
          <span class="download-value">{deuda.volumenConsumo} m³</span>
        </div>
      {/if}
      <div class="qr-download-item">
        <span class="download-label">Válido hasta:</span>
        <span class="download-value">{new Date(qrGenerado.dueDate).toLocaleDateString('es-BO')}</span>
      </div>
    </div>
  </div>

  <!-- Elemento visible para el usuario -->
  <div class="qr-generated">
    <div class="qr-header">
      <button 
        class="btn-back" 
        on:click={() => goToPreviousStep()}
        title="Volver al paso anterior"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
        Volver
      </button>
    </div>
    <img 
      src="data:image/png;base64,{qrGenerado.qrImage}" 
      alt="QR para pago" 
      class="qr-image"
      width="300" 
      height="300"
    />
    <div class="qr-details">
      <div class="qr-detail-item">
        <span class="detail-label">Monto:</span>
        <span class="detail-value">Bs. {qrGenerado.amount}</span>
      </div>
      <div class="qr-detail-item">
        <span class="detail-label">Descripción:</span>
        <span class="detail-value">{deuda?.descripcion}</span>
      </div>
      {#if deuda?.volumenConsumo}
        <div class="qr-detail-item">
          <span class="detail-label">Consumo:</span>
          <span class="detail-value">{deuda.volumenConsumo} m³</span>
        </div>
      {/if}
      <div class="qr-detail-item">
        <span class="detail-label">ID Transacción:</span>
        <span class="detail-value">{qrGenerado.transactionId}</span>
      </div>
      <div class="qr-detail-item">
        <span class="detail-label">Válido hasta:</span>
        <span class="detail-value">{new Date(qrGenerado.dueDate).toLocaleDateString('es-BO')}</span>
      </div>
    </div>
    
    <!-- Loader personalizado centrado debajo del QR -->
    {#if pollingInterval && qrStatus?.status !== 'used'}
      <div class="payment-loader">
        <div class="loader-spinner"></div>
        <span class="loader-text">Esperando pago...</span>
      </div>
    {/if}
    
    <!-- Indicador de pago exitoso -->
    {#if qrStatus?.status === 'used'}
      <div class="payment-success">
        <div class="success-icon">
          <CheckCircleIcon size="48" />
        </div>
        <div class="success-message-qr">
          <h4>¡Pago Exitoso!</h4>
          {#if qrStatus.payments && qrStatus.payments.length > 0}
            <div class="payment-details">
              <p><strong>Pagado por:</strong> {qrStatus.payments[0].senderName}</p>
              <p><strong>Fecha:</strong> {new Date(qrStatus.payments[0].paymentDate).toLocaleDateString('es-BO')}</p>
              <p><strong>Monto:</strong> Bs. {qrStatus.payments[0].amount}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Botones de acción del QR -->
    <div class="qr-actions">
      <button class="btn-download" on:click={() => descargarQR(qrGenerado.qrImage || '', qrGenerado.qrId || '')}>
        <DownloadIcon size="16" />
        Descargar
      </button>
      
      <button class="btn-share" on:click={() => compartirQR(qrGenerado.qrImage || '', qrGenerado.qrId || '')}>
        <Share2Icon size="16" />
        Compartir
      </button>
    </div>
  </div>
{/if}

<style>
  /* Estilos para el QR generado */
  .qr-generated {
    margin-top: 1rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    text-align: center;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .qr-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  
  .qr-image {
    width: 280px;
    height: 280px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    margin: 1rem 0;
    background: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }
  
  .qr-image:hover {
    transform: scale(1.02);
  }
  
  .qr-details {
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.8);
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .qr-detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .qr-detail-item:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1px;
  }
  
  .detail-value {
    font-weight: 600;
    color: #000000;
    font-size: 0.8rem;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  
  /* Loader personalizado para esperar pago */
  .payment-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);
  }
  
  .loader-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top: 3px solid #10b981;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loader-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
    text-align: center;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Estilos para el pago exitoso */
  .payment-success {
    margin-top: 1.5rem;
    padding: 2rem;
    background: rgba(5, 150, 105, 0.1);
    border: 2px solid rgba(5, 150, 105, 0.3);
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(5, 150, 105, 0.1);
    backdrop-filter: blur(10px);
  }
  
  .success-icon {
    margin-bottom: 1rem;
    color: #10b981;
  }
  
  .success-message-qr h4 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #10b981;
    margin: 0 0 1rem 0;
  }
  
  .payment-details {
    text-align: left;
    background: rgba(5, 150, 105, 0.15);
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid rgba(5, 150, 105, 0.3);
  }
  
  .payment-details p {
    font-size: 0.9rem;
    color: rgba(0, 0, 0, 0.9);
    margin: 0.5rem 0;
    line-height: 1.5;
  }
  
  .payment-details strong {
    color: #10b981;
    font-weight: 600;
  }
  
  /* Botones de acción del QR */
  .qr-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }
  
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    color: #000000;
  }
  
  .btn-back:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .btn-download, .btn-share {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
  }
  
  .btn-download {
    background: var(--color-bg-dark);
    color: #ffffff;
  }
  
  .btn-download:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  .btn-share {
    background: transparent;
    color: #000000;
    border: 1px solid rgba(0, 0, 0, 0.3);
  }
  
  .btn-share:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  }
  
  /* Estilos para el elemento de descarga minimalista */
  .qr-download-only {
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 400px;
    background: white;
    padding: 2rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    text-align: center;
    font-family: 'Quenia', sans-serif;
    display: none;
  }
  
  .qr-download-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1.5rem 0;
    font-family: 'Quenia', sans-serif;
  }
  
  .qr-download-details {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .qr-download-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(var(--gray-200), 0.3);
  }
  
  .qr-download-item:last-child {
    border-bottom: none;
  }
  
  .download-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    font-family: 'Quenia', sans-serif;
  }
  
  .download-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  /* Responsive para móvil */
  @media (max-width: 768px) {
    .qr-generated {
      padding: 1.5rem;
      margin-top: 0.5rem;
    }
    
    .qr-image {
      width: 250px;
      height: 250px;
    }
    
    .qr-actions {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .btn-download, .btn-share {
      width: 100%;
      justify-content: center;
    }
    
    
    .qr-details {
      padding: 0.75rem;
    }
    
    .payment-details {
      padding: 1rem;
    }
  }
</style>
