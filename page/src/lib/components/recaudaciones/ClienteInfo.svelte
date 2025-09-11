<script lang="ts">
  import { RefreshCwIcon } from 'svelte-feather-icons';

  interface Cliente {
    nombre: string;
    numeroCuenta: string;
    nit?: string;
    [key: string]: any;
  }

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

  export let cliente: Cliente;
  export let deudas: Deuda[] = [];
  export let montoTotal = 0;
  export let isLoading = false;
  
  // Función para obtener información del abonado (se propagará desde el padre)
  export let obtenerInfoAbonado: (numeroCuenta: string) => void = () => {};
</script>

<div class="debt-header">
  <h2>Facturas Pendientes</h2>
  <div class="client-info">
    <div class="client-details">
      <span class="client-name">{cliente.nombre}</span>
      <span class="client-account">Cuenta: {cliente.numeroCuenta}</span>
    </div>
    <button 
      class="btn-refresh-icon" 
      on:click={() => cliente && obtenerInfoAbonado(cliente.numeroCuenta)} 
      disabled={isLoading || !cliente}
      title="Actualizar información del cliente"
    >
      {#if isLoading}
        <span class="spinner"></span>
      {:else}
        <RefreshCwIcon size="18" />
      {/if}
    </button>
  </div>
</div>

<div class="debt-summary">
  <div class="summary-line">
    <span class="label">Total:</span>
    <span class="amount">Bs. {montoTotal.toFixed(2)}</span>
  </div>
  <div class="summary-line">
    <span class="label">Cantidad:</span>
    <span class="value">{deudas.length} deudas</span>
  </div>
</div>

<!-- El slot permite insertar contenido adicional desde el padre -->
<div class="actions-container">
  <slot></slot>
</div>

<style>
  .debt-header h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
    text-align: center;
  }
  
  .client-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--background-secondary);
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
  }
  
  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    text-align: left;
  }
  
  .client-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .client-account {
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: var(--background-tertiary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    display: inline-block;
    border: 1px solid var(--border-color);
    font-weight: 400;
    width: fit-content;
  }
  
  .debt-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
  }
  
  .summary-line .label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
  
  .summary-line .value {
    font-size: 0.8rem;
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .summary-line .amount {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--accent-color);
  }
  
  .btn-refresh-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius);
    background: var(--background-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }
  
  .btn-refresh-icon:hover {
    background: var(--background-secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
    color: var(--accent-color);
  }
  
  .btn-refresh-icon:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .btn-refresh-icon:disabled:hover {
    background: var(--background-tertiary);
    transform: none;
    box-shadow: var(--shadow-sm);
    color: var(--text-primary);
  }
  
  .actions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin: 1rem 0;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--gray-200), 0.3);
    border-top: 2px solid rgb(var(--primary));
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
