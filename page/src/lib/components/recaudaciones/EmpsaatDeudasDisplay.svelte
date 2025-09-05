<script lang="ts">
  import { CreditCardIcon } from 'svelte-feather-icons';
  
  // Interface para la respuesta de la API de EMPSAAT
  interface EmpsaatApiResponse {
    deudasAgua: Array<{
      factura: number;
      emision: string;
      lectura: number;
      consumoM3: number;
      importeFactura: number;
      fechaPago: string | null;
      cufFactura: string;
      abonado: number;
    }>;
    deudasServicios: Array<{
      idServicio?: number;
      id?: number;
      costo?: number;
      monto?: number;
      descripcion?: string;
      detalle?: string;
      fecha?: string;
    }>;
    totales: {
      totalAgua: number;
      totalServicios: number;
      totalDeuda: number;
    };
  }
  
  export let data: EmpsaatApiResponse | null = null;
  export let cliente: any = null;
  export let isGeneratingQR: boolean = false;
  export let isLoading: boolean = false;
  export let qrGenerado: any = null;
  export let error: string | null = null;
  
  export let generarQR: (deudaAgua: any) => void = () => {};
  export let pagarServicios: (deudas: any[], total: number) => void = () => {};
  export let obtenerInfoAbonado: (abonado: string) => void = () => {};
  
  
</script>

<div class="debt-list-container">
  <!-- Información del cliente -->
  {#if cliente}
    <div class="client-info">
      <h2>Información del Cliente</h2>
      <div class="client-details">
        <p><strong>Nombre:</strong> {cliente.nombre || 'Cliente'}</p>
        <p><strong>Número de Cuenta:</strong> {cliente.numeroCuenta}</p>
        <button 
          class="btn-update-info" 
          on:click={() => obtenerInfoAbonado(cliente.numeroCuenta)}
          disabled={isLoading}
        >
          {#if isLoading}
            <span class="spinner"></span>
            Actualizando...
          {:else}
            Actualizar Información
          {/if}
        </button>
      </div>
    </div>
  {/if}

  {#if (data?.deudasAgua?.length || 0) === 0 && (data?.deudasServicios?.length || 0) === 0}
    <div class="no-debts">
      <h3>¡No hay deudas pendientes!</h3>
      <p>Este abonado no tiene deudas pendientes de pago.</p>
    </div>
  {/if}
  
  {#if (data?.deudasAgua?.length || 0) > 0}
    <div class="debt-section">
      <h3>Facturas de Agua Pendientes</h3>
      <div class="section-total">
        <span class="label">Total Agua:</span>
        <span class="value">Bs. {(data?.totales?.totalAgua || 0).toFixed(2)}</span>
      </div>
      
      {#each (data?.deudasAgua || []) as deuda, index (deuda.factura)}
        <div class="debt-item">
          <div class="debt-main">
            <div class="debt-title">
              <span class="debt-number">Factura #{deuda.factura}</span>
              <span class="debt-amount">Bs. {deuda.importeFactura.toFixed(2)}</span>
            </div>
            <div class="debt-info">
              <div class="debt-description">
                Consumo agua ({deuda.consumoM3} m³)
                <span class="consumo-info">Lectura: {deuda.lectura}</span>
              </div>
              <div class="debt-meta">
                <span class="debt-date">{new Date(deuda.emision).toLocaleDateString('es-BO')}</span>
                <span class="debt-status {deuda.fechaPago ? 'pagado' : 'pendiente'}">
                  {deuda.fechaPago ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>
          
          <div class="debt-action">
            {#if index === 0 && !deuda.fechaPago}
              <button class="btn-pay" on:click={() => { console.log('Llamando generarQR con:', deuda); generarQR(deuda); }} disabled={isGeneratingQR}>
                {#if isGeneratingQR}
                  <span class="spinner"></span>
                  Generando QR...
                {:else}
                  <CreditCardIcon size="16" />
                  Pagar Bs. {deuda.importeFactura.toFixed(2)}
                {/if}
              </button>
            {:else if !deuda.fechaPago}
              <div class="debt-waiting">
                <span class="waiting-text">Paga primero la factura anterior</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if (data?.deudasServicios?.length || 0) > 0}
    <div class="debt-section">
      <h3>Servicios Adicionales Pendientes</h3>
      <div class="section-total">
        <span class="label">Total Servicios:</span>
        <span class="value">Bs. {(data?.totales?.totalServicios || 0).toFixed(2)}</span>
      </div>
      
      <!-- Botón para pagar todos los servicios de una vez -->
      {#if (data?.deudasServicios?.length || 0) > 1}
        <div class="bulk-actions">
          <button 
            class="btn-pay-all" 
            on:click={() => pagarServicios(data?.deudasServicios || [], data?.totales?.totalServicios || 0)} 
            disabled={isLoading}
          >
            {#if isLoading}
              <span class="spinner"></span>
              Procesando...
            {:else}
              <CreditCardIcon size="16" />
              Pagar Todos los Servicios (Bs. {(data?.totales?.totalServicios || 0).toFixed(2)})
            {/if}
          </button>
        </div>
      {/if}
      
      {#each (data?.deudasServicios || []) as deuda, index (deuda.idServicio || deuda.id || index)}
        <div class="debt-item">
          <div class="debt-main">
            <div class="debt-title">
              <span class="debt-number">Servicio #{deuda.idServicio || deuda.id || index + 1}</span>
              <span class="debt-amount">Bs. {(deuda.costo || deuda.monto || 0).toFixed(2)}</span>
            </div>
            <div class="debt-info">
              <div class="debt-description">
                {deuda.descripcion || deuda.detalle || 'Servicio adicional'}
              </div>
              <div class="debt-meta">
                <span class="debt-date">{deuda.fecha ? new Date(deuda.fecha).toLocaleDateString('es-BO') : '-'}</span>
                <span class="debt-status pendiente">Pendiente</span>
              </div>
            </div>
          </div>
          
          <div class="debt-action">
            <button class="btn-pay-service" on:click={() => pagarServicios([deuda], deuda.costo || deuda.monto || 0)} disabled={isLoading}>
              {#if isLoading}
                <span class="spinner"></span>
                Procesando...
              {:else}
                <CreditCardIcon size="16" />
                Pagar Servicio
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .debt-list-container {
    margin-top: 1rem;
    text-align: left;
  }
  
  .debt-section {
    margin-bottom: 2rem;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    padding: 1rem;
    border: 1px solid var(--border-color);
  }
  
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgb(var(--text-primary));
    margin-bottom: 0.75rem;
    text-align: center;
  }
  
  .section-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: var(--radius);
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
  }
  
  .section-total .label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
  
  .section-total .value {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--accent-color);
  }
  
  .bulk-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }
  
  .btn-pay-all {
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
    background: var(--gradient-primary);
    color: rgb(var(--white));
    box-shadow: var(--shadow);
  }
  
  .btn-pay-all:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
  
  .no-debts {
    background: var(--background-secondary);
    padding: 2.5rem 2rem;
    border-radius: var(--radius);
    text-align: center;
    border: 1px dashed var(--border-color);
    margin: 2rem 0;
  }
  
  .no-debts h3 {
    color: rgb(var(--success));
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 1.2rem;
  }
  
  .no-debts p {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  /* Estilos para las tarjetas de deuda */
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
  
  .btn-pay, .btn-pay-service {
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
    box-shadow: var(--shadow);
  }
  
  .btn-pay {
    background: var(--gradient-secondary);
    color: rgb(var(--white));
  }
  
  .btn-pay-service {
    background: rgb(var(--info));
    color: rgb(var(--white));
  }
  
  .btn-pay:hover, .btn-pay-service:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
  
  .btn-pay:disabled, .btn-pay-service:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(var(--gray-400), 0.8);
  }
  
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
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--white), 0.3);
    border-top: 2px solid rgb(var(--white));
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

  /* Estilos para información del cliente */
  .client-info {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
  }

  .client-info h2 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .client-details p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .client-details strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .btn-update-info {
    background: var(--gradient-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-update-info:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .btn-update-info:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
</style>