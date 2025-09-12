<script lang="ts">
  import { RefreshCwIcon, XIcon, CheckIcon } from 'svelte-feather-icons';
  
  // Componente SVG para QR Code
  const QrCodeIcon = (props: {size?: number, color?: string}) => {
    return `
      <svg width="${props.size || 16}" height="${props.size || 16}" viewBox="0 0 24 24" fill="none" stroke="${props.color || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="5" height="5"/>
        <rect x="3" y="16" width="5" height="5"/>
        <rect x="16" y="3" width="5" height="5"/>
        <path d="M21 16h-3v3h3v-3z"/>
        <path d="M21 21h.01"/>
        <path d="M12 7v3"/>
        <path d="M12 12h.01"/>
        <path d="M12 16h.01"/>
        <path d="M16 12h.01"/>
        <path d="M16 16h.01"/>
        <path d="M12 12h.01"/>
      </svg>
    `;
  };
  
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
  
  export let generarQR: (deudas: any[], total: number) => void = () => {};
  export let obtenerInfoAbonado: (abonado: string) => void = () => {};
  export let limpiarCliente: () => void = () => {};
  
  // Estado para deudas seleccionadas
  let deudasSeleccionadas: any[] = [];
  let totalSeleccionado: number = 0;
  
  // Función para alternar selección de deuda
  function toggleDeuda(deuda: any, tipo: 'agua' | 'servicio') {
    const deudaConTipo = { ...deuda, tipo };
    const index = deudasSeleccionadas.findIndex(d => 
      d.factura === deuda.factura && d.tipo === tipo
    );
    
    if (index > -1) {
      deudasSeleccionadas.splice(index, 1);
    } else {
      deudasSeleccionadas.push(deudaConTipo);
    }
    
    // Recalcular total
    totalSeleccionado = deudasSeleccionadas.reduce((sum, deuda) => {
      if (deuda.tipo === 'agua') {
        return sum + deuda.importeFactura;
      } else {
        return sum + (deuda.costo || deuda.monto || 0);
      }
    }, 0);
    
    deudasSeleccionadas = [...deudasSeleccionadas];
  }
  
  // Función para verificar si una deuda está seleccionada
  function isDeudaSeleccionada(deuda: any, tipo: 'agua' | 'servicio') {
    return deudasSeleccionadas.some(d => 
      d.factura === deuda.factura && d.tipo === tipo
    );
  }
  
  // Función para verificar si una deuda puede ser seleccionada
  function canSelectDeuda(deuda: any, tipo: 'agua' | 'servicio', index: number) {
    // Verificar si ya hay deudas de otro tipo seleccionadas
    const hayServiciosSeleccionados = deudasSeleccionadas.some(d => d.tipo === 'servicio');
    const hayAguaSeleccionada = deudasSeleccionadas.some(d => d.tipo === 'agua');
    
    if (tipo === 'agua') {
      // Para agua, solo se puede seleccionar si no hay servicios pendientes
      // O si todos los servicios están seleccionados
      const serviciosPendientes = (data?.deudasServicios?.length || 0);
      const serviciosSeleccionados = deudasSeleccionadas.filter(d => d.tipo === 'servicio').length;
      
      if (serviciosPendientes > 0 && serviciosSeleccionados < serviciosPendientes) {
        return false; // No se puede seleccionar agua si hay servicios sin seleccionar
      }
      
      // No se puede seleccionar agua si ya hay servicios seleccionados (pero no todos)
      if (hayServiciosSeleccionados && serviciosSeleccionados < serviciosPendientes) {
        return false;
      }
      
      // Lógica de orden: solo se puede seleccionar la más antigua (index 0)
      // o si ya está seleccionada la anterior
      if (index === 0) {
        return true; // La primera siempre se puede seleccionar
      }
      
      // Para las siguientes, solo si la anterior está seleccionada
      const deudaAnterior = data?.deudasAgua?.[index - 1];
      if (deudaAnterior) {
        return isDeudaSeleccionada(deudaAnterior, 'agua');
      }
      
      return false;
    }
    
    // Para servicios
    // No se puede seleccionar servicios si ya hay agua seleccionada
    if (hayAguaSeleccionada) {
      return false;
    }
    
    // Solo se puede seleccionar la más antigua (index 0)
    // o si ya está seleccionada la anterior
    if (index === 0) {
      return true; // La primera siempre se puede seleccionar
    }
    
    // Para las siguientes, solo si la anterior está seleccionada
    const deudaAnterior = data?.deudasServicios?.[index - 1];
    if (deudaAnterior) {
      return isDeudaSeleccionada(deudaAnterior, 'servicio');
    }
    
    return false;
  }
  
  // Función para pagar deudas seleccionadas
  function pagarDeudasSeleccionadas() {
    if (deudasSeleccionadas.length > 0) {
      generarQR(deudasSeleccionadas, totalSeleccionado);
    }
  }
  
  
</script>

<div class="debt-list-container">
  <!-- Información del cliente -->
  {#if cliente}
    <div class="client-info">
      <div class="client-header">
        <h2>Información del Cliente</h2>
        <div class="client-actions">
          <button 
            class="btn-sync-icon" 
            on:click={() => obtenerInfoAbonado(cliente.numeroCuenta)}
            disabled={isLoading}
            title="Actualizar información del cliente"
          >
            {#if isLoading}
              <span class="spinner"></span>
            {:else}
              <RefreshCwIcon size="18" />
            {/if}
          </button>
          <button 
            class="btn-clear-icon" 
            on:click={limpiarCliente}
            title="Limpiar información y volver a buscar"
          >
            <XIcon size="18" />
          </button>
        </div>
      </div>
      <div class="client-details">
        <p><strong>Nombre:</strong> {cliente.nombre || 'Cliente'}</p>
        <p><strong>Número de Cuenta:</strong> {cliente.numeroCuenta}</p>
      </div>
    </div>
  {/if}

  {#if (data?.deudasAgua?.length || 0) === 0 && (data?.deudasServicios?.length || 0) === 0}
    <div class="no-debts">
      <h3>¡No hay deudas pendientes!</h3>
      <p>Este abonado no tiene deudas pendientes de pago.</p>
    </div>
  {/if}
  
  <!-- Servicios primero (prioritarios) -->
  {#if (data?.deudasServicios?.length || 0) > 0}
    <div class="debt-section">
      <h3>Servicios Adicionales Pendientes</h3>
      <div class="section-total">
        <span class="label">Total Servicios:</span>
        <span class="value">Bs. {(data?.totales?.totalServicios || 0).toFixed(2)}</span>
      </div>
      
      {#each (data?.deudasServicios || []) as deuda, index (deuda.idServicio || deuda.id || index)}
        <div class="debt-item" class:selected={isDeudaSeleccionada(deuda, 'servicio')} class:disabled={!canSelectDeuda(deuda, 'servicio', index)} on:click={() => canSelectDeuda(deuda, 'servicio', index) && toggleDeuda(deuda, 'servicio')}>
          <div class="debt-icon service-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="debt-main">
            <div class="debt-info">
              <div class="debt-header">
                <div class="debt-number">{deuda.descripcion || deuda.detalle || 'Servicio adicional'}</div>
              </div>
              <div class="debt-consumo">Servicio #{deuda.idServicio || deuda.id || index + 1}</div>
              <div class="debt-periodo">{deuda.fecha ? new Date(deuda.fecha).toLocaleDateString('es-BO', { year: 'numeric', month: 'long' }).replace(' de ', ' ') : '-'}</div>
            </div>
            <div class="debt-right">
              <div class="debt-amount">Bs. {(deuda.costo || deuda.monto || 0).toFixed(2)}</div>
              <div class="debt-action">
                <div class="checkbox-indicator">
                  <div class="checkbox" class:checked={isDeudaSeleccionada(deuda, 'servicio')} class:disabled={!canSelectDeuda(deuda, 'servicio', index)}>
                    {#if isDeudaSeleccionada(deuda, 'servicio')}
                      <CheckIcon size="12" color="white" />
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Agua después -->
  {#if (data?.deudasAgua?.length || 0) > 0}
    <div class="debt-section">
      <h3>Facturas de Agua Pendientes</h3>
      {#if (data?.deudasServicios?.length || 0) > 0}
        {@const serviciosPendientes = (data?.deudasServicios?.length || 0)}
        {@const serviciosSeleccionados = deudasSeleccionadas.filter(d => d.tipo === 'servicio').length}
        {#if serviciosSeleccionados < serviciosPendientes}
          <div class="priority-notice" class:active={serviciosSeleccionados > 0}>
            <span class="notice-text">
              {#if serviciosSeleccionados > 0}
                🔒 Selecciona todas las deudas pendientes de servicio para poder pagar las de agua
              {:else}
                ⚠️ Selecciona todas las deudas pendientes de servicio para poder pagar las de agua
              {/if}
            </span>
          </div>
        {/if}
      {/if}
      <div class="section-total">
        <span class="label">Total Agua:</span>
        <span class="value">Bs. {(data?.totales?.totalAgua || 0).toFixed(2)}</span>
      </div>
      
      {#each (data?.deudasAgua || []) as deuda, index (deuda.factura)}
        <div class="debt-item" class:selected={isDeudaSeleccionada(deuda, 'agua')} class:disabled={!canSelectDeuda(deuda, 'agua', index)} on:click={() => canSelectDeuda(deuda, 'agua', index) && toggleDeuda(deuda, 'agua')}>
          <div class="debt-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <div class="debt-main">
            <div class="debt-info">
              <div class="debt-header">
                <div class="debt-number">{new Date(deuda.emision).toLocaleDateString('es-BO', { year: 'numeric', month: 'long' }).replace(' de ', ' ')}</div>
              </div>
              <div class="debt-consumo">{deuda.consumoM3} m³</div>
              <div class="debt-periodo">Factura #{deuda.factura}</div>
            </div>
            <div class="debt-right">
              <div class="debt-amount">Bs. {deuda.importeFactura.toFixed(2)}</div>
              <div class="debt-action">
                <div class="checkbox-indicator">
                  <div class="checkbox" class:checked={isDeudaSeleccionada(deuda, 'agua')} class:disabled={!canSelectDeuda(deuda, 'agua', index)}>
                    {#if isDeudaSeleccionada(deuda, 'agua')}
                      <CheckIcon size="12" color="white" />
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Botón de pago total -->
  {#if deudasSeleccionadas.length > 0}
    <div class="payment-summary">
      <div class="summary-info">
        <span class="summary-label">Total a pagar:</span>
        <span class="summary-amount">Bs. {totalSeleccionado.toFixed(2)}</span>
      </div>
      <button 
        class="btn-pay-total" 
        on:click={pagarDeudasSeleccionadas} 
        disabled={isGeneratingQR || deudasSeleccionadas.length === 0}
      >
        {#if isGeneratingQR}
          <span class="spinner"></span>
          Generando QR...
        {:else}
          {@html QrCodeIcon({size: 16, color: '#ffffff'})}
          Pagar {deudasSeleccionadas.length} deuda{deudasSeleccionadas.length > 1 ? 's' : ''}
        {/if}
      </button>
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
  
  .priority-notice {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    transition: all 0.2s ease;
  }
  
  .priority-notice.active {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .notice-text {
    font-size: 0.8rem;
    color: #d97706;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .priority-notice.active .notice-text {
    color: #dc2626;
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
    background: var(--color-bg-dark);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    box-shadow: var(--shadow);
  }
  
  .btn-pay-all:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .debt-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    flex-shrink: 0;
    margin-top: 0.25rem;
  }
  
  .debt-icon.service-icon {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }
  
  .debt-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
    border-color: rgb(var(--primary));
    cursor: pointer;
  }
  
  .debt-item.selected {
    border-color: var(--color-bg-dark);
    background: rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);
  }
  
  .debt-item.selected:hover {
    border-color: var(--color-bg-dark);
    background: rgba(0, 0, 0, 0.08);
  }
  
  .debt-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.02);
  }
  
  .debt-item.disabled:hover {
    transform: none;
    box-shadow: var(--shadow-sm);
    border-color: var(--border-color);
    background: rgba(0, 0, 0, 0.02);
  }
  
  .debt-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    width: 100%;
  }
  
  .debt-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    margin-right: 1rem;
  }
  
  .debt-header {
    margin-bottom: 0.25rem;
  }
  
  .debt-number {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.8rem;
  }
  
  
  .debt-consumo {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .debt-periodo {
    font-size: 0.7rem;
    color: var(--text-secondary);
    font-weight: 400;
  }
  
  .debt-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    min-width: 120px;
    flex-shrink: 0;
  }
  
  .debt-amount {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent-color);
    text-align: right;
  }
  
  .debt-action {
    text-align: right;
    display: flex;
    justify-content: flex-end;
  }
  
  .checkbox-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    min-height: 40px;
  }
  
  .checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    cursor: pointer;
    background: var(--background-primary);
  }
  
  .checkbox.checked {
    background: #000000;
    border-color: #000000;
    color: white;
  }
  
  .checkbox.disabled {
    background: var(--background-tertiary);
    border-color: var(--border-color);
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  .checkbox:hover:not(.disabled) {
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
  
  .payment-summary {
    background: var(--color-bg-dark);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    margin-top: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .summary-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .summary-label {
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
  }
  
  .summary-amount {
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .btn-pay-total {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: all 0.2s ease;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .btn-pay-total:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .btn-pay-total:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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
    background: var(--color-bg-dark);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  
  .btn-pay-service {
    background: var(--color-bg-dark);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  
  .btn-pay:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .btn-pay-service:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .btn-pay:disabled, .btn-pay-service:disabled, .btn-pay-all:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(255, 255, 255, 0.1);
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
    .debt-item {
      flex-direction: row;
      gap: 0.75rem;
    }
    
    .debt-icon {
      align-self: flex-start;
      margin-top: 0;
      flex-shrink: 0;
    }
    
    .debt-main {
      flex-direction: row;
      gap: 0.5rem;
      align-items: flex-start;
      width: 100%;
    }
    
    .debt-info {
      margin-right: 0.5rem;
      flex: 1;
    }
    
    .debt-right {
      align-items: flex-end;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .debt-amount {
      text-align: right;
      font-size: 0.9rem;
    }
    
    .debt-action {
      justify-content: flex-end;
      width: auto;
    }
    
    .payment-summary {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .summary-info {
      align-items: center;
    }
    
    .btn-pay-total {
      width: 100%;
      padding: 0.875rem 1.5rem;
    }
  }

  /* Estilos para información del cliente */
  .client-info {
    background: transparent;
    padding: 0;
    margin-bottom: 1.5rem;
  }

  .client-info h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .client-details p {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.4;
    font-weight: 500;
  }

  .client-details strong {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .client-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }


  .client-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-sync-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--background-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .btn-sync-icon:hover {
    background: var(--background-secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
    color: var(--accent-color);
  }

  .btn-sync-icon:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .btn-sync-icon:disabled:hover {
    background: var(--background-tertiary);
    transform: none;
    box-shadow: var(--shadow-sm);
    color: var(--text-primary);
  }

  /* Indicador de QR generado */
  .qr-generated-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    background: rgba(var(--success), 0.1);
    border: 1px solid rgba(var(--success), 0.3);
    border-radius: var(--radius);
    margin: 0.5rem 0;
  }

  .qr-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgb(var(--success));
    text-align: center;
  }

  .btn-clear-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--background-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .btn-clear-icon:hover {
    background: #fee2e2;
    transform: translateY(-1px);
    box-shadow: var(--shadow);
    color: #dc2626;
    border-color: #fecaca;
  }
</style>