<script lang="ts">
  import { CreditCardIcon, RefreshCwIcon, XIcon } from 'svelte-feather-icons';
  
  // Interfaces para tipos
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
  
  export let deuda: Deuda;
  export let index: number;
  export let isGeneratingQR: boolean;
  export let isLoading: boolean;
  export let permitirPagar: boolean = true;
  export let qrGenerado: any = null;
  export let error: string | null = null;
  export const deudas: Deuda[] = [];  // Cambiado a export const ya que no se usa internamente
  
  // Funciones que se propagarán desde el componente padre
  export let generarQR: (deuda: Deuda) => void = () => {};
  export let pagarServicios: (deudas: Deuda[], total: number) => void = () => {};
  
  // ID de transacción para asociar QR a deuda específica
  $: transactionId = `txn_${deuda?.numeroCuenta || ''}_${deuda?.monto || 0}`;
  
  // Indica si esta deuda tiene un QR generado
  $: tieneQR = qrGenerado && qrGenerado.transactionId === transactionId;
</script>

<div class="debt-item">
  <div class="debt-main">
    <div class="debt-title">
      <span class="debt-number">Deuda #{index + 1}</span>
      <span class="debt-amount">Bs. {deuda?.monto?.toFixed(2) || '0.00'}</span>
    </div>
    <div class="debt-info">
      <div class="debt-description">
        {deuda?.descripcion || 'Deuda'}
        {#if deuda?.volumenConsumo}
          <span class="consumo-info">Consumo: {deuda.volumenConsumo} m³</span>
        {/if}
        {#if deuda?.tipo}
          <span class="tipo-info">{deuda.tipo === 'agua' ? 'Factura de agua' : 'Servicio adicional'}</span>
        {/if}
      </div>
      <div class="debt-meta">
        <span class="debt-date">{deuda?.fecha ? new Date(deuda.fecha).toLocaleDateString('es-BO') : '-'}</span>
        <span class="debt-status {deuda?.estado || 'pendiente'}">{deuda?.estado || 'pendiente'}</span>
      </div>
    </div>
  </div>
  
  <div class="debt-action">
    <!-- Si es deuda de agua, permitir pagar la más antigua primero -->
    {#if deuda?.tipo === 'agua' || !deuda?.tipo}
      {#if permitirPagar}
        <button class="btn-pay" on:click={() => generarQR(deuda)} disabled={isGeneratingQR}>
          {#if isGeneratingQR}
            <span class="spinner"></span>
            Generando QR...
          {:else}
            <CreditCardIcon size="16" />
            Pagar Bs. {deuda?.monto?.toFixed(2) || '0.00'}
          {/if}
        </button>
      {:else}
        <!-- Para las otras deudas, mostrar mensaje de que deben pagar en orden -->
        <div class="debt-waiting">
          <span class="waiting-text">Paga primero la deuda anterior</span>
        </div>
      {/if}
    <!-- Si es servicio, permitir pagar individualmente -->
    {:else if deuda?.tipo === 'servicio'}
      <button class="btn-pay-service" on:click={() => pagarServicios([deuda], deuda?.monto || 0)} disabled={isLoading}>
        {#if isLoading}
          <span class="spinner"></span>
          Procesando...
        {:else}
          <CreditCardIcon size="16" />
          Pagar Servicio
        {/if}
      </button>
    {/if}
    
    <!-- Si hay un error específico para esta deuda -->
    {#if error && !permitirPagar && index === 0}
      <div class="qr-error">
        <div class="error-icon">
          <XIcon size="48" />
        </div>
        <div class="error-message-qr">
          <h4>Error al generar QR</h4>
          <p>{error}</p>
          <button class="btn-retry" on:click={() => generarQR(deuda)}>
            <RefreshCwIcon size="16" />
            Reintentar
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .debt-item {
    background: var(--background-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    padding: 1rem;
    margin-bottom: 0.75rem;
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
  }
  
  .debt-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
    border-color: rgb(var(--primary));
  }
  
  .debt-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  
  .debt-title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .debt-number {
    font-weight: 500;
    color: var(--primary-color);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
  
  .debt-amount {
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent-color);
  }
  
  .debt-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    margin-left: 1rem;
  }
  
  .debt-description {
    font-size: 0.8rem;
    color: var(--text-primary);
    font-weight: 500;
    line-height: 1.3;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .consumo-info {
    font-size: 0.7rem;
    color: rgb(var(--emerald));
    font-weight: 600;
    background: rgba(var(--emerald), 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    border: 1px solid rgba(var(--emerald), 0.2);
    display: inline-block;
    align-self: flex-start;
  }
  
  .tipo-info {
    font-size: 0.7rem;
    color: rgb(var(--info));
    font-weight: 600;
    background: rgba(var(--info), 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    border: 1px solid rgba(var(--info), 0.2);
    display: inline-block;
    align-self: flex-start;
    margin-top: 0.25rem;
  }
  
  .debt-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }
  
  .debt-date {
    font-weight: 400;
  }
  
  .debt-status {
    text-transform: capitalize;
    font-weight: 500;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    background: var(--background-tertiary);
    border: 1px solid var(--border-color);
  }
  
  .debt-status.pendiente {
    background: rgba(var(--warning), 0.1);
    color: rgb(var(--warning));
    border-color: rgb(var(--warning));
  }
  
  .debt-status.pagado {
    background: rgba(var(--success), 0.1);
    color: rgb(var(--success));
    border-color: rgb(var(--success));
  }
  
  .debt-action {
    margin-top: 0.5rem;
    text-align: right;
  }
  
  .btn-pay {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    justify-content: center;
    background: var(--gradient-secondary);
    color: rgb(var(--white));
    box-shadow: var(--shadow);
  }
  
  .btn-pay:hover {
    background: rgb(var(--secondary-dark));
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
  
  .btn-pay:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(var(--gray-400), 0.8);
  }
  
  .btn-pay:disabled:hover {
    transform: none;
    box-shadow: var(--shadow);
  }
  
  .btn-pay .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--white), 0.3);
    border-top: 2px solid rgb(var(--white));
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }
  
  .btn-pay-service {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    justify-content: center;
    background: rgb(var(--info));
    color: rgb(var(--white));
    box-shadow: var(--shadow);
  }
  
  .btn-pay-service:hover {
    background: rgb(var(--info-dark));
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Estilos para deudas en espera */
  .debt-waiting {
    padding: 0.75rem 1rem;
    background: rgba(var(--gray-100), 0.5);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    text-align: center;
    opacity: 0.7;
  }
  
  .waiting-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  /* Estilos para el error del QR */
  .qr-error {
    margin-top: 1rem;
    padding: 1.5rem;
    background: rgba(var(--error), 0.05);
    border: 2px solid rgba(var(--error), 0.2);
    border-radius: var(--radius);
    text-align: center;
    box-shadow: var(--shadow-sm);
  }
  
  .error-icon {
    margin-bottom: 1rem;
    color: rgb(var(--error));
  }
  
  .error-message-qr h4 {
    font-size: 1rem;
    font-weight: 600;
    color: rgb(var(--error));
    margin: 0 0 0.5rem 0;
  }
  
  .error-message-qr p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
    line-height: 1.4;
  }
  
  .btn-retry {
    background: rgb(var(--error));
    color: rgb(var(--white));
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    transition: var(--transition);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-sm);
  }
  
  .btn-retry:hover {
    background: rgb(var(--error));
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }
  
  @media (max-width: 768px) {
    .debt-main {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .debt-info {
      margin-left: 0;
    }
    
    .debt-meta {
      flex-direction: column;
      gap: 0.25rem;
      align-items: flex-start;
    }
  }
</style>
