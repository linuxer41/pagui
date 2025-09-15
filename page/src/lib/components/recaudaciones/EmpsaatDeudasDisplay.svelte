<script lang="ts">
  import { RefreshCwIcon, XIcon, CheckIcon, SquareIcon, CheckSquareIcon, DropletIcon, StarIcon } from 'svelte-feather-icons';
  import PaymentNotificationHandler from './PaymentNotificationHandler.svelte';
  
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
  
  // Interface para la respuesta de la API de EMPSAAT con múltiples abonados
  interface EmpsaatApiResponse {
    deudas: Array<{
      abonado: {
        abonado: number;
        nit: number;
        nombre: string;
        ci: string;
        medidor: string;
        zona: string;
        direccion: string;
        categoria: string;
        estado: string;
      };
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
        noSolicitud?: number;
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
    }>;
    totalGeneral: {
      totalAgua: number;
      totalServicios: number;
      totalDeuda: number;
    };
  }
  
  export let data: EmpsaatApiResponse | null = null;
  export let isGeneratingQR: boolean = false;
  export let isLoading: boolean = false;
  export let qrGenerado: any = null;
  export let error: string | null = null;
  
  export let generarQR: (deudas: any[], total: number, abonado: any) => void = () => {};
  export const limpiarCliente: () => void = () => {};
  export let goToPreviousStep: () => void = () => {};
  export let onRefresh: () => void = () => {};
  
  // Variables para notificaciones de pago
  let currentQrId: string = '';
  let paymentStatus: string = 'pending';
  let showPaymentSuccess = false;
  let showPaymentError = false;
  let paymentMessage = '';
  
  
  // Variable para controlar el estado de actualización
  let isRefreshing = false;
  
  // Estado para múltiples abonados
  let abonadoActivo: number = 0; // Índice del abonado activo
  let deudasSeleccionadas: any[] = [];
  let totalSeleccionado: number = 0;
  
  // Obtener el abonado activo
  $: abonadoActual = data?.deudas?.[abonadoActivo] || null;
  
  // Debug: Log para verificar la estructura de datos
  $: if (data) {
    console.log('EmpsaatDeudasDisplay - data:', data);
    console.log('EmpsaatDeudasDisplay - data.deudas:', data.deudas);
    console.log('EmpsaatDeudasDisplay - abonadoActual:', abonadoActual);
  }
  
  
  
  // Array unificado de deudas formateadas para el abonado activo
  $: deudasUnificadas = (() => {
    if (!abonadoActual) return [];
    
    const deudas: any[] = [];
    let currentIndex = 0;
    
    // Agregar servicios primero (prioritarios)
    if (abonadoActual.deudasServicios) {
      abonadoActual.deudasServicios.forEach((deuda: any) => {
        deudas.push({
          ...deuda,
          tipo: 'servicio',
          tipoLabel: 'Servicio',
          titulo: deuda.descripcion || deuda.detalle || 'Servicio adicional',
          subtitulo: `#${deuda.noSolicitud || deuda.idServicio || deuda.id || currentIndex + 1}`,
          periodo: deuda.fecha ? `Fecha de solicitud: ${new Date(deuda.fecha).toLocaleDateString('es-BO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}` : 'Fecha de solicitud: -',
          monto: deuda.costo || deuda.monto || 0,
          icono: 'service',
          index: currentIndex++,
          abonado: abonadoActual.abonado.abonado
        });
      });
    }
    
    // Agregar agua después, ordenadas por fecha (más antigua primero)
    if (abonadoActual.deudasAgua) {
      const deudasAguaOrdenadas = [...abonadoActual.deudasAgua].sort((a, b) => {
        return new Date(a.emision).getTime() - new Date(b.emision).getTime();
      });
      
      deudasAguaOrdenadas.forEach((deuda) => {
        deudas.push({
          ...deuda,
          tipo: 'agua',
          tipoLabel: 'Consumo',
          titulo: new Date(deuda.emision).toLocaleDateString('es-BO', { year: 'numeric', month: 'long' }).replace(' de ', ' '),
          subtitulo: `${deuda.consumoM3} m³`,
          periodo: `Factura #${deuda.factura || 'N/A'}`,
          monto: deuda.importeFactura,
          icono: 'water',
          index: currentIndex++,
          abonado: abonadoActual.abonado.abonado
        });
      });
    }
    
    return deudas;
  })();
  
  // Seleccionar automáticamente la primera deuda si hay deudas disponibles
  $: if (deudasUnificadas.length > 0 && deudasSeleccionadas.length === 0) {
    // Seleccionar la primera deuda automáticamente
    seleccionarDeuda(deudasUnificadas[0]);
  }
  
  // Función para seleccionar/deseleccionar deuda con lógica secuencial
  function toggleDeuda(deuda: any) {
    // Solo se puede interactuar si está habilitada
    if (!isDebtEnabled(deuda)) {
      return;
    }
    
    // Si la deuda ya está seleccionada, deseleccionarla
    if (isDeudaSeleccionada(deuda)) {
      deseleccionarDeuda(deuda);
      return;
    }
    
    // Si la deuda no está seleccionada, verificar si se puede seleccionar
    if (!canSelectDeuda(deuda)) {
      return;
    }
    
    // Seleccionar la deuda actual
    seleccionarDeuda(deuda);
  }
  
  // Función para seleccionar una deuda
  function seleccionarDeuda(deuda: any) {
    deudasSeleccionadas.push(deuda);
    recalcularTotal();
    // Limpiar error si se selecciona una deuda válida
    if (error && totalSeleccionado > 0) {
      error = null;
    }
  }
  
  // Función para deseleccionar una deuda
  function deseleccionarDeuda(deuda: any) {
    const index = deudasSeleccionadas.findIndex((d: any) => 
      d.factura === deuda.factura && d.tipo === deuda.tipo
    );
    
    if (index > -1) {
      deudasSeleccionadas.splice(index, 1);
      recalcularTotal();
    }
  }
  
  // Función para recalcular el total
  function recalcularTotal() {
    totalSeleccionado = deudasSeleccionadas.reduce((sum: number, deuda: any) => {
      const monto = parseFloat(deuda.monto) || 0;
      return sum + monto;
    }, 0);
    
    // Asegurar que el total no sea negativo
    totalSeleccionado = Math.max(0, totalSeleccionado);
    
    deudasSeleccionadas = [...deudasSeleccionadas];
  }
  
  // Función para verificar si una deuda está seleccionada
  function isDeudaSeleccionada(deuda: any) {
    return deudasSeleccionadas.some((d: any) => 
      d.factura === deuda.factura && d.tipo === deuda.tipo
    );
  }
  
  // Función para verificar si una deuda puede ser seleccionada
  function canSelectDeuda(deuda: any) {
    // Si ya está seleccionada, se puede deseleccionar (toggle)
    if (isDeudaSeleccionada(deuda)) {
      return true;
    }
    
    // Solo se puede seleccionar si está habilitada
    return isDebtEnabled(deuda);
  }
  
  // Funciones para manejar notificaciones de pago
  function handlePaymentSuccess(data: any) {
    console.log('Pago exitoso recibido:', data);
    showPaymentSuccess = true;
    showPaymentError = false;
    paymentMessage = '¡Pago procesado exitosamente!';
    paymentStatus = 'paid';
    
    // Limpiar selecciones después del pago exitoso
    setTimeout(() => {
      deudasSeleccionadas = [];
      totalSeleccionado = 0;
      qrGenerado = null;
      showPaymentSuccess = false;
      paymentStatus = 'pending';
    }, 5000);
  }
  
  function handlePaymentError(error: string) {
    console.log('Error de pago recibido:', error);
    showPaymentError = true;
    showPaymentSuccess = false;
    paymentMessage = error;
    paymentStatus = 'failed';
    
    // Limpiar mensaje de error después de 5 segundos
    setTimeout(() => {
      showPaymentError = false;
      paymentStatus = 'pending';
    }, 5000);
  }
  
  function handlePaymentStatusChange(status: string) {
    console.log('Estado de pago cambiado:', status);
    paymentStatus = status;
  }
  
  // Función para actualizar el QR ID cuando se genera un nuevo QR
  function updateQrId(qrId: string | null) {
    currentQrId = qrId || '';
  }
  
  // Función para verificar si una deuda debe estar habilitada para selección
  function isDebtEnabled(deuda: any) {
    // Si ya está seleccionada, se puede deseleccionar
    if (isDeudaSeleccionada(deuda)) {
      return true;
    }
    
    // Solo se puede seleccionar la primera deuda (index 0) o la siguiente en orden
    if (deuda.index === 0) {
      return true; // La primera siempre se puede seleccionar
    }
    
    // Para las siguientes, solo si la anterior está seleccionada
    const deudaAnterior = deudasUnificadas[deuda.index - 1];
    if (deudaAnterior) {
      return isDeudaSeleccionada(deudaAnterior);
    }
    
    return false;
  }
  
  // Función para verificar si una deuda debe mostrar el checkbox como activo
  function isCheckboxActive(deuda: any) {
    return isDeudaSeleccionada(deuda);
  }
  
  // Funciones auxiliares basadas en el array unificado
  function getDeudasPorTipo(tipo: 'agua' | 'servicio') {
    return deudasUnificadas.filter((d: any) => d.tipo === tipo);
  }
  
  function getDeudasSeleccionadasPorTipo(tipo: 'agua' | 'servicio') {
    return deudasSeleccionadas.filter((d: any) => d.tipo === tipo);
  }
  
  function getTotalPorTipo(tipo: 'agua' | 'servicio') {
    return getDeudasSeleccionadasPorTipo(tipo).reduce((sum: number, deuda: any) => sum + deuda.monto, 0);
  }
  
  // Función para cambiar de abonado
  function cambiarAbonado(index: number) {
    abonadoActivo = index;
    // Limpiar selecciones al cambiar de abonado
    deudasSeleccionadas = [];
    totalSeleccionado = 0;
  }
  
  
  // Función para pagar deudas seleccionadas
  function pagarDeudasSeleccionadas() {
    if (deudasSeleccionadas.length > 0 && abonadoActual && totalSeleccionado > 0) {
      generarQR(deudasSeleccionadas, totalSeleccionado, abonadoActual.abonado);
    } else if (totalSeleccionado <= 0) {
      error = 'El total a pagar debe ser mayor a cero';
    }
  }
  
  // Función para actualizar el QR ID cuando se genera un nuevo QR
  $: if (qrGenerado?.qrId) {
    updateQrId(qrGenerado.qrId);
  }

  // Función para manejar la actualización de deudas
  async function handleRefresh() {
    if (onRefresh && !isRefreshing) {
      isRefreshing = true;
      try {
        await onRefresh();
      } finally {
        isRefreshing = false;
      }
    }
  }
  
  
</script>

<div class="debt-list-container">
  <!-- Navegación y información del cliente -->
  <div class="debt-header">
    <div class="header-top">
      <h2 class="debt-list-title">Facturas Pendientes</h2>
      <button 
        class="btn-refresh-icon" 
        class:refreshing={isRefreshing}
        on:click={handleRefresh}
        title="Actualizar deudas"
        disabled={isLoading || isRefreshing}
      >
        <RefreshCwIcon size="16" />
      </button>
    </div>
    
    {#if data?.deudas && data.deudas.length > 0}
      <!-- Pestañas de abonados si hay múltiples -->
      {#if data.deudas.length > 1}
        <div class="abonados-tabs">
          {#each data.deudas as abonado, index}
            <button 
              class="tab-button" 
              class:active={index === abonadoActivo}
              on:click={() => cambiarAbonado(index)}
            >
              <div class="tab-content">
                <div class="tab-title">Abonado {abonado.abonado.abonado}</div>
                <div class="tab-subtitle">{abonado.abonado.nombre}</div>
                <div class="tab-amount">Bs. {abonado.totales.totalDeuda.toFixed(2)}</div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      
      <!-- Información del abonado activo -->
      {#if abonadoActual}
        <div class="client-summary">
          <div class="client-name">{abonadoActual.abonado.nombre || 'Cliente'}</div>
          <div class="client-details">
            <div class="client-account">
              <span class="label">Abonado:</span>
              <span class="value">{abonadoActual.abonado.abonado}</span>
            </div>
            {#if abonadoActual.abonado.medidor}
              <div class="client-meter">
                <span class="label">Número de Medidor:</span>
                <span class="value">{abonadoActual.abonado.medidor}</span>
              </div>
            {/if}
            <div class="client-zone">
              <span class="label">Zona:</span>
              <span class="value">{abonadoActual.abonado.zona}</span>
            </div>
            <div class="client-address">
              <span class="label">Dirección:</span>
              <span class="value">{abonadoActual.abonado.direccion}</span>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  {#if error}
    <div class="error-message">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h3>Error al procesar la solicitud</h3>
        <p>{error}</p>
        <button class="retry-button" on:click={() => { error = null; generarQR(deudasSeleccionadas, totalSeleccionado, abonadoActual); }}>
          Intentar nuevamente
        </button>
      </div>
    </div>
  {/if}


  {#if abonadoActual && (abonadoActual.deudasAgua?.length || 0) === 0 && (abonadoActual.deudasServicios?.length || 0) === 0}
    <div class="no-debts">
      <h3>¡No hay deudas pendientes!</h3>
      <p>Este abonado no tiene deudas pendientes de pago.</p>
    </div>
  {/if}
  
  <!-- Lista unificada de deudas -->
  <div class="debt-list">
    {#each deudasUnificadas as deuda (deuda.factura || deuda.idServicio || deuda.id)}
      <div 
        class="debt-item" 
        class:selected={isDeudaSeleccionada(deuda)} 
        class:disabled={!isDebtEnabled(deuda)} 
        on:click={() => toggleDeuda(deuda)}
        on:keydown={(e) => e.key === 'Enter' && toggleDeuda(deuda)}
        role="button"
        tabindex="0"
        aria-label="Seleccionar deuda: {deuda.titulo} - Bs. {deuda.monto.toFixed(2)}"
      >
        <div class="debt-icon-container">
          <div class="debt-icon" class:service-icon={deuda.icono === 'service'}>
            {#if deuda.icono === 'service'}
              <StarIcon size="20" />
            {:else}
              <DropletIcon size="20" />
            {/if}
          </div>
          <div class="debt-type-label">{deuda.tipoLabel}</div>
        </div>
        <div class="debt-main">
          <div class="debt-info">
            <div class="debt-header">
              <div class="debt-number">{deuda.titulo}</div>
            </div>
            <div class="debt-consumo">
              <span class="consumption-label">
                {deuda.tipo === 'servicio' ? 'Solicitud:' : 'Consumo:'}
              </span>
              {deuda.subtitulo}
            </div>
            <div class="debt-periodo">{deuda.periodo}</div>
          </div>
          <div class="debt-right">
            <div class="debt-amount">Bs. {deuda.monto.toFixed(2)}</div>
            <div class="debt-action">
              <div class="checkbox-indicator">
                {#if deudasSeleccionadas.includes(deuda)}
                  <CheckSquareIcon size="16" />
                {:else}
                  <SquareIcon size="16" />
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/each}
    
  </div>
  
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
        disabled={isGeneratingQR || deudasSeleccionadas.length === 0 || totalSeleccionado <= 0}
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
  
  <!-- Notificaciones de pago -->
  {#if showPaymentSuccess}
    <div class="payment-notification success">
      <div class="notification-icon">✓</div>
      <div class="notification-message">{paymentMessage}</div>
    </div>
  {/if}
  
  {#if showPaymentError}
    <div class="payment-notification error">
      <div class="notification-icon">✗</div>
      <div class="notification-message">{paymentMessage}</div>
    </div>
  {/if}
  
  <!-- Componente de notificaciones SSE -->
  <PaymentNotificationHandler 
    qrId={currentQrId}
    onPaymentSuccess={handlePaymentSuccess}
    onPaymentError={handlePaymentError}
    onPaymentStatusChange={handlePaymentStatusChange}
  />
</div>

<style>
  .debt-list-container {
    margin-top: 1rem;
    text-align: left;
  }
  
  .debt-list {
    margin-top: 2rem;
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
  
  
  
  .priority-notice.active {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .notice-text {
    font-size: 0.9rem;
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }
  
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.3);
    color: #000000;
  }
  
  .btn-back:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  
  /* Estilos para las tarjetas de deuda - Flutter Material Design 3 */
  .debt-item {
    background: transparent;
    border: none;
    border-radius: 12px;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: none;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
    overflow: hidden;
  }
  
  .debt-icon-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
    width: 56px;
  }
  
  .debt-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
    flex-shrink: 0;
    font-size: 1.3rem;
  }
  
  .debt-icon.service-icon {
    background: linear-gradient(135deg, #059669, #10b981);
  }
  
  .debt-item:hover {
    background: rgba(0, 0, 0, 0.04);
    cursor: pointer;
  }
  
  .debt-item.selected {
    background: rgba(0, 0, 0, 0.08);
    cursor: default;
  }
  
  .debt-item.selected:hover {
    background: rgba(0, 0, 0, 0.08);
    cursor: default;
  }
  
  .debt-item.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    background: transparent;
  }
  
  .debt-item.disabled:hover {
    background: transparent;
    cursor: not-allowed;
  }
  
  .debt-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-height: 40px;
  }
  
  .debt-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    margin-right: 0.75rem;
  }
  
  .debt-header {
    margin-bottom: 0.25rem;
  }
  
  .debt-type-label {
    background: rgba(0, 0, 0, 0.12);
    color: rgba(0, 0, 0, 0.6);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-size: 0.55rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    display: inline-block;
    text-align: center;
    white-space: nowrap;
    width: 56px;
    box-sizing: border-box;
  }
  
  
  .debt-number {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.85rem;
    line-height: 1.2;
  }
  
  
  .debt-consumo {
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .consumption-label {
    font-size: 0.65rem;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  
  .debt-periodo {
    font-size: 0.65rem;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 400;
  }
  
  .debt-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    min-width: 100px;
    flex-shrink: 0;
  }
  
  .debt-amount {
    font-size: 0.95rem;
    font-weight: 600;
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
    padding: 0.25rem;
    min-height: 32px;
  }
  
  .checkbox {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    cursor: pointer;
    background: transparent;
    color: rgba(0, 0, 0, 0.6);
  }
  
  .checkbox.checked {
    background: #000000;
    color: white;
  }
  
  .checkbox.disabled {
    background: transparent;
    color: rgba(0, 0, 0, 0.12);
    cursor: not-allowed;
    opacity: 0.38;
  }
  
  .checkbox:hover:not(.disabled) {
    color: rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.04);
  }
  
  .checkbox.checked:hover {
    background: rgba(0, 0, 0, 0.8);
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
    font-size: 0.9rem;
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
    
    .debt-icon-container {
      align-self: flex-start;
      flex-shrink: 0;
    }
    
    .debt-icon {
      margin-top: 0;
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
      font-size: 1rem;
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
    
    /* Aumentar fuentes en móvil */
    .debt-title {
      font-size: 1rem;
    }
    
    .debt-subtitle {
      font-size: 0.9rem;
    }
    
    .debt-period {
      font-size: 0.9rem;
    }
    
    .debt-consumo {
      font-size: 0.9rem;
    }
    
    .debt-amount {
      font-size: 1rem;
    }
    
    .summary-label {
      font-size: 1rem;
    }
    
    .summary-amount {
      font-size: 1.2rem;
    }
    
    .client-name {
      font-size: 1.1rem;
    }
    
    .client-info {
      font-size: 0.9rem;
    }
    
    .client-meter,
    .client-subscriber {
      font-size: 0.9rem;
    }
    
    .btn-pay-total {
      width: 100%;
      padding: 0.875rem 1.5rem;
    }
  }



  .debt-header {
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
  }
  
  .header-top {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .btn-back {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.2);
    color: #000000;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .btn-back:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
  }

  .btn-refresh-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgb(var(--gray-800));
    border: 1px solid rgba(var(--gray-600), 0.3);
    color: rgb(var(--white));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .btn-refresh-icon:hover:not(:disabled) {
    background: rgb(var(--gray-700));
    border-color: rgba(var(--gray-500), 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-refresh-icon:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .btn-refresh-icon.refreshing {
    animation: spin 1s linear infinite;
  }
  
  .debt-list-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #000000;
    margin: 0;
    text-align: center;
    flex: 1;
  }
  
  .client-summary {
    text-align: left;
  }
  
  .client-name {
    font-size: 1rem;
    font-weight: 600;
    color: #000000;
    margin-bottom: 0.5rem;
  }
  
  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .client-account,
  .client-meter,
  .client-subscriber {
    font-size: 0.9rem;
    color: rgba(0, 0, 0, 0.7);
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .client-account .label,
  .client-meter .label,
  .client-subscriber .label {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    min-width: 120px;
  }
  
  .client-account .value,
  .client-meter .value,
  .client-subscriber .value {
    font-weight: 400;
    color: rgba(0, 0, 0, 0.6);
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
  
  /* Notificaciones de pago */
  .payment-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  }
  
  .payment-notification.success {
    background: #10b981;
    color: white;
  }
  
  .payment-notification.error {
    background: #ef4444;
    color: white;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .error-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .error-content {
    flex: 1;
  }

  .error-content h3 {
    margin: 0 0 0.5rem 0;
    color: #dc2626;
    font-size: 1rem;
    font-weight: 600;
  }

  .error-content p {
    margin: 0 0 1rem 0;
    color: #7f1d1d;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .retry-button {
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background: #b91c1c;
  }

  
  .notification-icon {
    font-size: 1.25rem;
    font-weight: bold;
  }
  
  .notification-message {
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Estilos para pestañas de abonados */
  .abonados-tabs {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 0.5rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
  }
  
  .abonados-tabs::-webkit-scrollbar {
    height: 6px;
  }
  
  .abonados-tabs::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .abonados-tabs::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }
  
  .abonados-tabs::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }

  .tab-button {
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 200px;
    flex-shrink: 0;
    text-align: left;
  }

  .tab-button:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
  }

  .tab-button.active {
    background: var(--color-bg-dark);
    border-color: var(--color-bg-dark);
    color: white;
  }

  .tab-button.active:hover {
    background: #1a1a1a;
    border-color: #1a1a1a;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .tab-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: inherit;
  }

  .tab-subtitle {
    font-size: 0.8rem;
    color: inherit;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-amount {
    font-size: 0.85rem;
    font-weight: 600;
    color: inherit;
    opacity: 0.9;
  }

  .tab-button:not(.active) .tab-title {
    color: #000000;
  }

  .tab-button:not(.active) .tab-subtitle {
    color: rgba(0, 0, 0, 0.6);
  }

  .tab-button:not(.active) .tab-amount {
    color: #059669;
  }

  /* Estilos adicionales para información del cliente */
  .client-zone,
  .client-address {
    font-size: 0.9rem;
    color: rgba(0, 0, 0, 0.7);
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .client-zone .label,
  .client-address .label {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    min-width: 80px;
  }

  .client-zone .value,
  .client-address .value {
    font-weight: 400;
    color: rgba(0, 0, 0, 0.6);
  }

  /* Responsive para pestañas */
  @media (max-width: 768px) {
    .abonados-tabs {
      flex-direction: row;
      gap: 0.5rem;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 0.75rem;
    }

    .tab-button {
      min-width: 180px;
      flex-shrink: 0;
      width: auto;
    }

    .tab-content {
      align-items: flex-start;
      text-align: left;
    }

    .tab-subtitle {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

</style>