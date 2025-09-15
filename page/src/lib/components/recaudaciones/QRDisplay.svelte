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
  <!-- Elemento visible para el usuario - Material Design 3 -->
  <div class="qr-container" id="qr-capture-container">
    
    <div class="qr-content" id="qr-capture-content">
      <div class="qr-image-container">
        <img 
          src="data:image/png;base64,{qrGenerado.qrImage}" 
          alt="QR para pago" 
          class="qr-image"
        />
      </div>
      
      <div class="qr-info">
        <div class="qr-amount">
          <span class="amount-label">Total a Pagar</span>
          <span class="amount-value">Bs. {qrGenerado.amount}</span>
        </div>
        
        <div class="qr-details">
          <!-- IDs compactos en una sola fila -->
          <div class="qr-ids-compact">
            <div class="qr-id-compact">
              <span class="id-label">QR:</span>
              <span class="qr-id">{qrGenerado.qrId}</span>
            </div>
            <div class="transaction-id-compact">
              <span class="id-label">TXN:</span>
              <span class="transaction-id">{qrGenerado.transactionId}</span>
            </div>
          </div>
          
          <div class="qr-detail-item">
            <span class="detail-label">Descripción</span>
            <span class="detail-value">{deuda?.descripcion || 'Pago de deudas'}</span>
          </div>
          {#if deuda?.volumenConsumo}
            <div class="qr-detail-item">
              <span class="detail-label">Consumo</span>
              <span class="detail-value">{deuda.volumenConsumo} m³</span>
            </div>
          {/if}
          <div class="qr-detail-item">
            <span class="detail-label">Válido hasta</span>
            <span class="detail-value">{new Date(qrGenerado.dueDate).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Indicador sutil de espera de pago -->
    {#if pollingInterval && qrStatus?.status !== 'used'}
      <div class="payment-indicator">
        <div class="dots-container">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
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
  /* Estilos Material Design 3 para QR */
  .qr-container {
    background: transparent;
    border: none;
    border-radius: 12px;
    padding: 0;
    margin: 0;
    text-align: left;
  }
  
  .qr-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  
  .qr-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .qr-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .qr-image {
    width: 280px;
    height: 280px;
    border: none;
    border-radius: 8px;
    background: white;
    box-shadow: none;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .qr-image:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .qr-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .qr-amount {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
  }
  
  .amount-label {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  
  .amount-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--accent-color);
  }
  
  .qr-details {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    background: transparent;
    padding: 0;
    border: none;
  }
  
  .qr-ids-compact {
    display: flex;
    gap: 0.75rem;
    padding: 0.375rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .qr-id-compact, .transaction-id-compact {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
  }
  
  .id-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    min-width: 30px;
  }
  
  .qr-detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .qr-detail-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }
  
  .detail-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  
  .detail-value {
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.8);
    font-weight: 500;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  
  .qr-id, .transaction-id {
    font-family: 'Courier New', monospace;
    font-size: 0.7rem;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    user-select: all;
    transition: all 0.2s ease;
    flex: 1;
    text-align: left;
  }
  
  .qr-id:hover, .transaction-id:hover {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.2);
    transform: scale(1.01);
  }
  
  .qr-id {
    color: #059669;
    font-weight: 600;
  }
  
  .transaction-id {
    color: #7c3aed;
    font-weight: 600;
  }
  
  /* Indicador sutil de espera de pago */
  .payment-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 1rem;
    padding: 0.5rem;
  }
  
  .dots-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 1.4s ease-in-out infinite both;
  }
  
  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }
  
  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }
  
  .dot:nth-child(3) {
    animation-delay: 0s;
  }
  
  @keyframes pulse {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
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
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    background: transparent;
    color: #000000;
  }
  
  .btn-back:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.5);
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
  
  
  /* Responsive para móvil */
  @media (max-width: 768px) {
    .qr-image {
      width: 250px;
      height: 250px;
    }
    
    .qr-ids-compact {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .qr-id-compact, .transaction-id-compact {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    
    .id-label {
      min-width: auto;
    }
    
    .qr-id, .transaction-id {
      width: 100%;
      text-align: left;
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
