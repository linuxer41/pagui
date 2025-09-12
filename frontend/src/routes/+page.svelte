<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import {
      ArrowDownLeft,
      ArrowUpRight,
      Calendar,
      CalendarDays,
      ChevronRight,
      ClipboardList,
      Clock,
      QrCode,
      RefreshCw,
      Wifi,
      WifiOff,
      AlertCircle
  } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { tweened } from 'svelte/motion';
  import { fade, fly, scale } from 'svelte/transition';
  import { onSSEEvent, sseConnection, reconnectSSE } from '$lib/services/sseService';
  import NotificationToast from '$lib/components/NotificationToast.svelte';

  
  // Datos de la billetera
  let wallet = {
    balance: 0,
    currency: 'BOB'
  };
  
  // Función para obtener las cuentas del usuario
  function getAccounts() {
    allAccounts = $auth.accounts || [];
    const primaryAccount = allAccounts.find(account => account.isPrimary) || allAccounts[0];
    if (primaryAccount) {
      currentAccount = primaryAccount;
      selectedAccountId = primaryAccount.id;
    }
  }

  // Función para cambiar de cuenta
  async function switchAccount(accountId: string) {
    const account = allAccounts.find(acc => acc.id === accountId);
    if (account) {
      selectedAccountId = accountId;
      currentAccount = account;
      
      // Cargar estadísticas de la nueva cuenta (incluye toda la info de la cuenta)
      await loadAccountStats();
    }
  }


  // Función para cargar estadísticas de la cuenta (incluye toda la info de la cuenta)
  async function loadAccountStats() {
    if (!currentAccount) return;
    
    loadingStats = true;
    try {
      const response = await api.getAccountStats(currentAccount.id);
      if (response.success && response.data) {
        const stats = response.data;
        
        // Actualizar información de la cuenta
        if (stats.account) {
          currentAccount = stats.account;
          wallet.balance = parseFloat(stats.account.availableBalance);
          wallet.currency = stats.account.currency;
        }
        
        // Actualizar estadísticas de recaudación
        collections.daily = stats.today?.amount || 0;
        collections.weekly = stats.thisWeek?.amount || 0;
        collections.monthly = stats.thisMonth?.amount || 0;
        
        growthPercentages.daily = stats.today?.growthPercentage || 0;
        growthPercentages.weekly = stats.thisWeek?.growthPercentage || 0;
        growthPercentages.monthly = stats.thisMonth?.growthPercentage || 0;
        
        // Cargar movimientos recientes desde las estadísticas
        accountMovements = stats.recentMovements || [];
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de cuenta:', error);
    } finally {
      loadingStats = false;
    }
  }
  
  // Datos de recaudaciones por periodo
  let collections = {
    daily: 0,
    weekly: 0,
    monthly: 0
  };
  
  // Porcentajes de crecimiento
  let growthPercentages = {
    daily: 0,
    weekly: 0,
    monthly: 0
  };
  
  let loading = true;
  let loadingStats = false;
  let currentAccount: any = null;
  let allAccounts: any[] = [];
  let selectedAccountId: string = '';
  let accountMovements: any[] = [];
  
  // Modal state
  let showMovementModal = false;
  let selectedMovement: any = null;

  // Variables para manejar eventos SSE
  let unsubscribeSSEEvents: (() => void)[] = [];

  // Variables para información del cliente/abonado
  let clientInfo: any = null;
  let loadingClientInfo = false;

  // Variables para estado de pagos QR
  let qrStatus: any = null;
  let qrPayments: any[] = [];
  let loadingQRStatus = false;
  let qrIdInput = '';

  // Verificar autenticación y cargar datos
  onMount(async () => {
    // Cargar cuentas del usuario
    getAccounts();
    
    try {
      // Cargar estadísticas de la cuenta (incluye movimientos recientes)
      await loadAccountStats();
      
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    } finally {
      loading = false;
    }

    // Configurar listeners de eventos SSE
    setupSSEListeners();
  });

  // Limpiar listeners al destruir el componente
  onDestroy(() => {
    unsubscribeSSEEvents.forEach(unsubscribe => unsubscribe());
  });

  // Configurar listeners de eventos SSE
  function setupSSEListeners() {
    // Escuchar eventos de pago QR
    const unsubscribePayment = onSSEEvent('qr_payment', (data) => {
      console.log('Pago recibido en página principal:', data);
      
      // Actualizar balance si es de la cuenta actual
      if (currentAccount && data.currency === wallet.currency) {
        wallet.balance += data.amount;
      }
      
      // Recargar estadísticas para obtener movimientos actualizados
      loadAccountStats();
    });

    // Escuchar eventos de actualización de balance
    const unsubscribeBalance = onSSEEvent('account_balance_update', (data) => {
      console.log('Balance actualizado en página principal:', data);
      
      // Actualizar balance si es de la cuenta actual
      if (currentAccount && data.accountId === currentAccount.id) {
        wallet.balance = data.newAvailableBalance;
      }
      
      // Recargar estadísticas para obtener movimientos actualizados
      loadAccountStats();
    });

    // Escuchar eventos de cambio de estado de QR
    const unsubscribeQRStatus = onSSEEvent('qr_status_change', (data) => {
      console.log('Estado de QR cambiado en página principal:', data);
      
      // Recargar estadísticas si es relevante
      loadAccountStats();
    });

    unsubscribeSSEEvents = [unsubscribePayment, unsubscribeBalance, unsubscribeQRStatus];
  }



  function handleGenerarQR() {
    goto('/qr/generate');
  }

  function handleVerPagos() {
    goto('/transactions');
  }
  
  // Función para abrir el modal de detalles del movimiento
  function openMovementModal(movement: any) {
    selectedMovement = movement;
    showMovementModal = true;
  }
  
  // Función para cerrar el modal
  function closeMovementModal() {
    showMovementModal = false;
    selectedMovement = null;
  }

  function handleReconnectSSE() {
    reconnectSSE();
  }
  
  // Formatear fecha para mostrar de forma amigable
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Hoy, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Ayer, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  
  // Formatear montos con separador de miles y decimales
  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Función para obtener el símbolo de moneda
  function getCurrencySymbol(currency: string): string {
    switch (currency.toUpperCase()) {
      case 'BOB':
        return 'Bs.';
      case 'USD':
        return '$';
      default:
        return currency;
    }
  }

  // Función para parsear la información del cliente desde la respuesta
  function parseClientInfo(response: any[]) {
    if (!response || response.length < 3) return null;
    
    const [status, success, data, abonado, nombre, nit, medidor, zona, calle, num, categoria, ley1886, estado, mensaje] = response;
    
    return {
      success: status?.success || false,
      abonado: abonado || data?.abonado,
      nombre: nombre || data?.nombre,
      nit: nit || data?.nit,
      medidor: medidor || data?.medidor,
      zona: zona || data?.zona,
      calle: calle || data?.calle,
      num: num || data?.num,
      categoria: categoria || data?.categoria,
      ley1886: ley1886 || data?.ley1886,
      estado: estado || data?.estado,
      mensaje: mensaje || data?.mensaje
    };
  }

  // Función para cargar información del cliente (ejemplo)
  async function loadClientInfo(subscriberId: string) {
    loadingClientInfo = true;
    try {
      // Aquí harías la llamada a tu API
      // const response = await api.getClientInfo(subscriberId);
      // clientInfo = parseClientInfo(response);
      
      // Ejemplo con los datos que proporcionaste
      const exampleResponse = [{"success":1,"abonado":2,"mensaje":11},true,{"abonado":3,"nombre":4,"nit":5,"medidor":6,"zona":7,"calle":6,"num":6,"categoria":8,"ley1886":9,"estado":10},1520,"TICONA CAYO PABLO",0,"","BARRIO SAN GERARDO","A1",false,"N","Información obtenida para el abonado 1520"];
      clientInfo = parseClientInfo(exampleResponse);
    } catch (error) {
      console.error('Error al cargar información del cliente:', error);
    } finally {
      loadingClientInfo = false;
    }
  }

  // Función para verificar el estado de un QR
  async function checkQRStatus(qrId: string) {
    if (!qrId.trim()) {
      alert('Por favor ingresa un ID de QR válido');
      return;
    }

    loadingQRStatus = true;
    try {
      // Verificar estado del QR
      const statusResponse = await api.checkQRStatus(qrId);
      if (statusResponse.success && statusResponse.data) {
        qrStatus = statusResponse.data;
        
        // Obtener pagos del QR
        const paymentsResponse = await api.getQRPayments(qrId);
        if (paymentsResponse.success && paymentsResponse.data) {
          qrPayments = paymentsResponse.data.payments || [];
        }
      } else {
        qrStatus = null;
        qrPayments = [];
        alert('No se pudo obtener el estado del QR');
      }
    } catch (error) {
      console.error('Error al verificar estado del QR:', error);
      qrStatus = null;
      qrPayments = [];
      alert('Error al verificar el estado del QR');
    } finally {
      loadingQRStatus = false;
    }
  }

  // Función para limpiar la información del QR
  function clearQRInfo() {
    qrStatus = null;
    qrPayments = [];
    qrIdInput = '';
  }

  // Animación para el saldo (balance)
  let animatedBalance = tweened(wallet.balance, { duration: 800, easing: cubicOut });

  $: if (wallet.balance !== $animatedBalance) {
    animatedBalance.set(wallet.balance);
  }

</script>

<!-- Estructura básica de la página principal -->
<div class="unified-layout safe-area-top">
  <!-- Header principal fijo con saldo y opciones -->
  <header class="main-header">
    <div class="header-top">
      <div class="logo-container">
        <img src="/favicon.png" alt="Logo" width="30" />
        <h2>Pagui</h2>
      </div>
      
      <div class="header-actions">
        <button class="header-action-button" on:click={() => goto('/profile')}>
          <div class="user-avatar">
            P
          </div>
        </button>
      </div>
    </div>
    
    {#if loading}
      <!-- Loading Placeholders -->
      <div class="loading-placeholders">
        <!-- Wallet Placeholder -->
        <div class="wallet-placeholder">
          <div class="placeholder-skeleton balance-skeleton"></div>
          <div class="placeholder-skeleton account-skeleton"></div>
        </div>
        
        <!-- Stats Placeholders -->
        <div class="stats-placeholders">
          <div class="placeholder-skeleton stat-skeleton"></div>
          <div class="placeholder-skeleton stat-skeleton"></div>
          <div class="placeholder-skeleton stat-skeleton"></div>
        </div>
        
        <!-- Movements Placeholder -->
        <div class="movements-placeholder">
          <div class="placeholder-skeleton movement-skeleton"></div>
          <div class="placeholder-skeleton movement-skeleton"></div>
          <div class="placeholder-skeleton movement-skeleton"></div>
        </div>
      </div>
    {:else}
      <!-- Wallet Info - Integrated in Header -->
      <div class="wallet-info" in:fly={{ y: -20, duration: 500 }}>
        <div class="wallet-balance">
          <span class="balance-currency">{getCurrencySymbol(wallet.currency)}</span>
          <span class="balance-amount" in:scale={{ duration: 600, easing: cubicOut }}>
            {#if $animatedBalance !== undefined}
              {formatCurrency($animatedBalance)}
            {:else}
              {formatCurrency(wallet.balance)}
            {/if}
          </span>
        </div>
        {#if currentAccount}
          <div class="wallet-account" in:fade={{ duration: 400, delay: 200 }}>
            {currentAccount.accountNumber}
          </div>
        {/if}
        
        <!-- Indicador de estado de conexión SSE - Integrado en wallet -->
        <div class="sse-status-indicator">
          {#if $sseConnection.isConnected}
            <div class="status-dot connected" title="Notificaciones en tiempo real activas">
              <Wifi size={8} />
            </div>
          {:else if $sseConnection.isConnecting}
            <div class="status-dot connecting" title="Conectando...">
              <RefreshCw size={8} class="spinning" />
            </div>
          {:else if $sseConnection.error}
            <div class="status-dot error" title="{$sseConnection.error} - Click para reconectar" on:click={handleReconnectSSE} on:keydown={(e) => e.key === 'Enter' && handleReconnectSSE()} role="button" tabindex="0">
              <WifiOff size={8} />
            </div>
          {:else}
            <div class="status-dot disconnected" title="Desconectado">
              <AlertCircle size={8} />
            </div>
          {/if}
        </div>
        
      </div>
    {/if}

      <!-- Tabs de cuentas (solo si hay más de una cuenta) -->
      {#if allAccounts.length > 1}
        <div class="account-tabs" in:fly={{ y: 20, duration: 400, delay: 300 }}>
          <div class="tabs-container">
            {#each allAccounts as account (account.id)}
              <button 
                class="account-tab {selectedAccountId === account.id ? 'active' : ''}"
                on:click={() => switchAccount(account.id)}
              >
                <div class="tab-content">
                  <span class="tab-currency">{getCurrencySymbol(account.currency)}</span>
                  <span class="tab-number">{account.accountNumber.slice(-4)}</span>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    
    <!-- Acciones principales -->
    <div class="header-actions-bar">
      <button class="header-action-pill" on:click={handleGenerarQR}>
        <span class="action-icon">
          <QrCode size={18} strokeWidth={2} />
        </span>
        <span>Cobrar</span>
      </button>
      
      <button class="header-action-pill" on:click={handleVerPagos}>
        <span class="action-icon">
          <ClipboardList size={18} strokeWidth={2} />
        </span>
        <span>Historial</span>
      </button>
    </div>
  </header>

  <!-- Contenido principal -->
  <div class="main-content">
    {#if !loading}
      <!-- Sección de Resumen de Recaudaciones -->
      <div class="section collections-section" in:fade={{ duration: 500 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Resumen de Recaudaciones</h2>
      <!-- <button class="view-all-button compact-view" on:click={() => goto('/resume')}>Ver detalles <ChevronRight size={16} /></button> -->
    </div>
    <div class="collections-grid">
      <div class="collection-item" in:fly={{ y: 30, duration: 400, delay: 100 }}>
        <div class="collection-icon daily">
          <Clock size={20} />
        </div>
        <div class="collection-details">
          <h3 style="font-size:0.85rem;">Hoy</h3>
          <div class="collection-amount">
            <span class="currency-symbol">{wallet.currency}</span>
            <span in:scale={{ duration: 600, easing: cubicOut }}>{formatCurrency(collections.daily)}</span>
          </div>
          <div class="collection-trend positive">+{growthPercentages.daily.toFixed(1)}%</div>
        </div>
      </div>
      <div class="collection-item" in:fly={{ y: 30, duration: 400, delay: 200 }}>
        <div class="collection-icon weekly">
          <Calendar size={20} />
        </div>
        <div class="collection-details">
          <h3 style="font-size:0.85rem;">Esta Semana</h3>
          <div class="collection-amount">
            <span class="currency-symbol">{wallet.currency}</span>
            <span in:scale={{ duration: 600, easing: cubicOut }}>{formatCurrency(collections.weekly)}</span>
          </div>
          <div class="collection-trend positive">+{growthPercentages.weekly.toFixed(1)}%</div>
        </div>
      </div>
      <div class="collection-item" in:fly={{ y: 30, duration: 400, delay: 300 }}>
        <div class="collection-icon monthly">
          <CalendarDays size={20} />
        </div>
        <div class="collection-details">
          <h3 style="font-size:0.85rem;">Este Mes</h3>
          <div class="collection-amount">
            <span class="currency-symbol">{wallet.currency}</span>
            <span in:scale={{ duration: 600, easing: cubicOut }}>{formatCurrency(collections.monthly)}</span>
          </div>
          <div class="collection-trend positive">+{growthPercentages.monthly.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  </div>
  <!-- Información del Cliente/Abonado -->
  <div class="section client-info-section" in:fade={{ duration: 500, delay: 50 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Información del Cliente</h2>
      <button class="view-all-button compact-view" on:click={() => loadClientInfo('1520')}>
        {loadingClientInfo ? 'Cargando...' : 'Cargar Info'}
      </button>
    </div>
    
    {#if loadingClientInfo}
      <div class="loading-client-info">
        <div class="loading-spinner mini"></div>
        <span>Cargando información del cliente...</span>
      </div>
    {:else if clientInfo}
      <div class="client-info-card" in:fly={{ y: 20, duration: 400, delay: 100 }}>
        <div class="client-header">
          <div class="client-avatar">
            {clientInfo.nombre ? clientInfo.nombre.charAt(0).toUpperCase() : 'C'}
          </div>
          <div class="client-main-info">
            <h3 class="client-name">{clientInfo.nombre || 'Cliente'}</h3>
            <p class="client-subscriber">Abonado #{clientInfo.abonado}</p>
          </div>
          <div class="client-status {clientInfo.estado === 'A' ? 'active' : 'inactive'}">
            {clientInfo.estado === 'A' ? 'Activo' : 'Inactivo'}
          </div>
        </div>
        
        <div class="client-details">
          <div class="detail-row">
            <span class="detail-label">NIT:</span>
            <span class="detail-value">{clientInfo.nit || 'No disponible'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Medidor:</span>
            <span class="detail-value">{clientInfo.medidor || 'No disponible'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Zona:</span>
            <span class="detail-value">{clientInfo.zona || 'No disponible'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dirección:</span>
            <span class="detail-value">{clientInfo.calle} {clientInfo.num}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Categoría:</span>
            <span class="detail-value">{clientInfo.categoria || 'No disponible'}</span>
          </div>
          {#if clientInfo.ley1886}
            <div class="detail-row">
              <span class="detail-label">Ley 1886:</span>
              <span class="detail-value">{clientInfo.ley1886 ? 'Sí' : 'No'}</span>
            </div>
          {/if}
        </div>
        
        {#if clientInfo.mensaje}
          <div class="client-message">
            <p>{clientInfo.mensaje}</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-client-info">
        <p>No hay información del cliente disponible</p>
        <button class="load-client-button" on:click={() => loadClientInfo('1520')}>
          Cargar información
        </button>
      </div>
    {/if}
  </div>

  <!-- Verificación de Estado QR -->
  <div class="section qr-status-section" in:fade={{ duration: 500, delay: 75 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Verificar Estado QR</h2>
      <button class="view-all-button compact-view" on:click={clearQRInfo}>
        Limpiar
      </button>
    </div>
    
    <div class="qr-status-form">
      <div class="input-group">
        <input 
          type="text" 
          bind:value={qrIdInput}
          placeholder="Ingresa el ID del QR"
          class="qr-id-input"
          disabled={loadingQRStatus}
        />
        <button 
          class="check-qr-button" 
          on:click={() => checkQRStatus(qrIdInput)}
          disabled={loadingQRStatus || !qrIdInput.trim()}
        >
          {loadingQRStatus ? 'Verificando...' : 'Verificar'}
        </button>
      </div>
    </div>

    {#if loadingQRStatus}
      <div class="loading-qr-status">
        <div class="loading-spinner mini"></div>
        <span>Verificando estado del QR...</span>
      </div>
    {:else if qrStatus}
      <div class="qr-status-card" in:fly={{ y: 20, duration: 400, delay: 100 }}>
        <div class="qr-status-header">
          <div class="qr-status-info">
            <h3 class="qr-id">QR #{qrStatus.qrId}</h3>
            <div class="qr-amount">
              {getCurrencySymbol(qrStatus.currency)} {formatCurrency(qrStatus.amount)}
            </div>
          </div>
          <div class="qr-status-badge {qrStatus.status}">
            {qrStatus.status === 'active' ? 'Activo' : 
             qrStatus.status === 'paid' ? 'Pagado' : 
             qrStatus.status === 'expired' ? 'Expirado' : 
             qrStatus.status === 'cancelled' ? 'Cancelado' : qrStatus.status}
          </div>
        </div>
        
        <div class="qr-details">
          <div class="detail-row">
            <span class="detail-label">Descripción:</span>
            <span class="detail-value">{qrStatus.description || 'Sin descripción'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha de vencimiento:</span>
            <span class="detail-value">{qrStatus.dueDate ? new Date(qrStatus.dueDate).toLocaleDateString('es-ES') : 'No especificada'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Uso único:</span>
            <span class="detail-value">{qrStatus.singleUse ? 'Sí' : 'No'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Modificar monto:</span>
            <span class="detail-value">{qrStatus.modifyAmount ? 'Sí' : 'No'}</span>
          </div>
        </div>

        {#if qrPayments.length > 0}
          <div class="qr-payments">
            <h4>Pagos realizados ({qrPayments.length})</h4>
            <div class="payments-list">
              {#each qrPayments as payment, i (payment.id || i)}
                <div class="payment-item" in:fly={{ y: 10, duration: 300, delay: 50 + i * 50 }}>
                  <div class="payment-info">
                    <div class="payment-amount">
                      {getCurrencySymbol(payment.currency || qrStatus.currency)} {formatCurrency(payment.amount)}
                    </div>
                    <div class="payment-date">
                      {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                    </div>
                  </div>
                  <div class="payment-status paid">
                    Pagado
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if qrStatus.status === 'paid'}
          <div class="no-payments">
            <p>Este QR ha sido pagado pero no se encontraron detalles de pagos.</p>
          </div>
        {/if}
      </div>
    {:else if qrIdInput && !loadingQRStatus}
      <div class="no-qr-status">
        <p>No se encontró información para el QR ingresado.</p>
      </div>
    {/if}
  </div>

  <!-- Movimientos de cuenta recientes -->
  <div class="section transactions-section" in:fade={{ duration: 500, delay: 100 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Movimientos recientes</h2>
      <button class="view-all-button compact-view" on:click={() => goto('/transactions')}>Ver todas <ChevronRight size={16} /></button>
    </div>
    <div class="transactions-list">
      {#if loadingStats}
        <div class="loading-transactions">
          <div class="loading-spinner mini"></div>
          <span>Cargando movimientos...</span>
        </div>
      {:else if accountMovements.length === 0}
        <div class="empty-transactions">
          <p>No hay movimientos recientes</p>
        </div>
      {:else}
        {#each accountMovements.slice(0, 5) as movement, i (movement.id)}
          <div class="transaction-item simple" in:fly={{ y: 20, duration: 400, delay: 100 + i * 80 }} on:click={() => openMovementModal(movement)} on:keydown={(e) => e.key === 'Enter' && openMovementModal(movement)} role="button" tabindex="0">
            <div class="transaction-icon incoming">
              <ArrowDownLeft size={18} />
            </div>
            <div class="transaction-details">
              <div class="transaction-title">
                {movement.senderName || movement.description || 'Movimiento de cuenta'}
              </div>
              <div class="transaction-date">{formatDate(movement.createdAt)}</div>
            </div>
            <div class="transaction-amount income">
              + {getCurrencySymbol(movement.currency || wallet.currency)} <span in:scale={{ duration: 500 }}>{formatCurrency(movement.amount)}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
    {/if}
  </div>
</div>

<!-- Modal para detalles del movimiento -->
{#if showMovementModal && selectedMovement}
  <div class="modal-overlay" on:click={closeMovementModal} on:keydown={(e) => e.key === 'Escape' && closeMovementModal()} role="button" aria-labelledby="modal-title" tabindex="0">
    <div class="modal-content" role="document">
      <div class="modal-header" on:click|stopPropagation on:keydown|stopPropagation role="button" tabindex="0">
        <h2 id="modal-title">Detalles del Movimiento</h2>
        <button class="modal-close" on:click={closeMovementModal}>×</button>
      </div>
      <div class="modal-body" on:click|stopPropagation on:keydown|stopPropagation role="button" tabindex="0">
        <div class="movement-details">
          <!-- Información principal -->
          <div class="detail-section">
            <div class="detail-item">
              <span class="detail-label">Remitente:</span>
              <span class="detail-value">{selectedMovement.senderName || 'No disponible'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Descripción:</span>
              <span class="detail-value">{selectedMovement.description}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Monto:</span>
              <span class="detail-value amount">+ {getCurrencySymbol(selectedMovement.currency || wallet.currency)} {formatCurrency(selectedMovement.amount)}</span>
            </div>
          </div>
          
          <!-- Información de la transacción -->
          <div class="detail-section">
            <h3>Información de la Transacción</h3>
            <div class="detail-item">
              <span class="detail-label">ID de Transacción:</span>
              <span class="detail-value code">{selectedMovement.transactionId || 'No disponible'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Referencia:</span>
              <span class="detail-value code">{selectedMovement.reference || 'No disponible'}</span>
            </div>
            {#if selectedMovement.qrId}
              <div class="detail-item">
                <span class="detail-label">ID QR:</span>
                <span class="detail-value code">{selectedMovement.qrId}</span>
              </div>
            {/if}
          </div>
          
          <!-- Información del remitente -->
          {#if selectedMovement.senderAccount || selectedMovement.senderBankCode}
            <div class="detail-section">
              <h3>Información del Remitente</h3>
              {#if selectedMovement.senderAccount}
                <div class="detail-item">
                  <span class="detail-label">Cuenta:</span>
                  <span class="detail-value code">{selectedMovement.senderAccount}</span>
                </div>
              {/if}
              {#if selectedMovement.senderBankCode}
                <div class="detail-item">
                  <span class="detail-label">Código de Banco:</span>
                  <span class="detail-value code">{selectedMovement.senderBankCode.trim()}</span>
                </div>
              {/if}
              {#if selectedMovement.senderDocumentId}
                <div class="detail-item">
                  <span class="detail-label">Documento:</span>
                  <span class="detail-value code">{selectedMovement.senderDocumentId}</span>
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- Fechas y horarios -->
          <div class="detail-section">
            <h3>Fechas y Horarios</h3>
            <div class="detail-item">
              <span class="detail-label">Fecha de Creación:</span>
              <span class="detail-value">{formatDate(selectedMovement.createdAt)}</span>
            </div>
            {#if selectedMovement.paymentDate}
              <div class="detail-item">
                <span class="detail-label">Fecha de Pago:</span>
                <span class="detail-value">{new Date(selectedMovement.paymentDate).toLocaleDateString('es-ES')}</span>
              </div>
            {/if}
            {#if selectedMovement.paymentTime}
              <div class="detail-item">
                <span class="detail-label">Hora de Pago:</span>
                <span class="detail-value">{selectedMovement.paymentTime}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Componente de notificaciones -->
<NotificationToast />

<style>
  /* Estilos para la estructura básica */
  .unified-layout {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    height: 100dvh;
    width: 100%;
    background-color: var(--background);
  }
  
  /* Header principal fijo con saldo */
  .main-header {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 1rem 0.5rem;
    background-color: var(--background);
    z-index: 100;
    position: sticky;
    top: 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }
  
  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .logo-container h2 {
    font-size: 1rem;
    margin: 0;
    color: var(--text-primary);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .header-action-button {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  
  .user-avatar {
    width: 34px;
    height: 34px;
    border-radius: var(--border-radius-full);
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 2px 6px rgba(58, 102, 255, 0.2);
  }
  
  /* Wallet Info - Integrated in Header */
  .wallet-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 1rem;
    position: relative;
  }
  
  /* Barra de acciones */
  .header-actions-bar {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 0.75rem 0 0.5rem;
  }
  
  .header-action-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    background: var(--primary-color);
    border: none;
    border-radius: var(--border-radius-lg);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    gap: 0.5rem;
    transition: all 0.3s ease;
    cursor: pointer;
    min-width: 110px;
    box-shadow: 0 2px 8px rgba(58, 102, 255, 0.2);
  }
  
  .header-action-pill:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(58, 102, 255, 0.3);
  }
  
  .header-action-pill:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(58, 102, 255, 0.2);
  }
  
  /* Contenido principal */
  .main-content {
    flex: 1;
    width: 100%;
    margin: auto;
    max-width: 480px;
    overflow-y: auto;
    padding: 0.75rem 0.75rem 1.5rem;
  }
  
  /* Estilos para el balance en el header */
  
  /* Wallet Balance - Minimalist */
  .wallet-balance {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }
  
  .balance-currency {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-color);
    opacity: 0.8;
  }
  
  .balance-amount {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-primary);
  }
  


  /* Wallet Account - Minimalist */
  .wallet-account {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    letter-spacing: 0.05em;
    opacity: 0.7;
  }

  /* Indicador de estado de conexión SSE - Integrado en wallet */
  .sse-status-indicator {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 10;
  }

  .status-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    cursor: pointer;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status-dot.connected {
    background: rgba(0, 202, 141, 0.15);
    color: var(--success-color);
    box-shadow: 0 0 0 2px rgba(0, 202, 141, 0.2);
  }

  .status-dot.connecting {
    background: rgba(255, 175, 0, 0.15);
    color: var(--warning-color);
    box-shadow: 0 0 0 2px rgba(255, 175, 0, 0.2);
  }

  .status-dot.error {
    background: rgba(233, 58, 74, 0.15);
    color: var(--error-color);
    box-shadow: 0 0 0 2px rgba(233, 58, 74, 0.2);
  }

  .status-dot.disconnected {
    background: rgba(107, 114, 128, 0.15);
    color: var(--text-secondary);
    box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2);
  }

  .status-dot:hover {
    transform: scale(1.1);
  }

  .status-dot.connected:hover {
    box-shadow: 0 0 0 3px rgba(0, 202, 141, 0.3);
  }

  .status-dot.error:hover {
    box-shadow: 0 0 0 3px rgba(233, 58, 74, 0.3);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Responsive Wallet Styles */
  @media (max-width: 768px) {
    .wallet-info {
      gap: 0.2rem;
      margin-bottom: 0.75rem;
    }
    
    .balance-amount {
      font-size: 1.2rem;
    }
    
    .balance-currency {
      font-size: 0.9rem;
    }
    
    .wallet-account {
      font-size: 0.75rem;
    }

    .sse-status-indicator {
      top: 0.5rem;
      right: 0.5rem;
    }

    .status-dot {
      width: 20px;
      height: 20px;
    }
  }

  /* Tabs de cuentas */
  .account-tabs {
    margin-top: var(--spacing-md);
    padding: 0 var(--spacing-lg);
  }

  .tabs-container {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    padding-bottom: var(--spacing-xs);
  }

  .account-tab {
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
    flex-shrink: 0;
  }

  .account-tab:hover {
    background: var(--background-primary);
    border-color: var(--primary-color);
  }

  .account-tab.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .tab-currency {
    font-size: 0.7rem;
    font-weight: 600;
    opacity: 0.8;
  }

  .tab-number {
    font-size: 0.8rem;
    font-weight: 700;
    font-family: monospace;
  }

  /* Responsive para tabs */
  @media (max-width: 768px) {
    .account-tabs {
      padding: 0 var(--spacing-sm);
    }
    
    .account-tab {
      min-width: 70px;
      padding: var(--spacing-xs) var(--spacing-sm);
    }
    
    .tab-currency {
      font-size: 0.65rem;
    }
    
    .tab-number {
      font-size: 0.75rem;
    }
  }
  
  .currency-symbol {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--primary-color);
    opacity: 0.9;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.25rem;
  }

  /* Sección de recaudaciones */
  .collections-section, .transactions-section, .client-info-section, .qr-status-section {
    margin-bottom: 2.5rem;
  }
  
  /* Sección */
  .section {
    padding-top: 0.5rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0 1.5rem;
    padding: 0 1rem;
    height: 2rem; /* Altura fija para mejor alineación */
  }
  
  .view-all-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    height: 100%; /* Ocupar toda la altura del contenedor */
  }
  
  .view-all-button:hover {
    background: rgba(58, 102, 255, 0.1);
    color: var(--primary-dark);
  }
  
  /* Grid de recaudaciones */
  .collections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    padding: 0 1rem;
  }
  
  .collection-item {
    background: var(--surface);
    border-radius: 1rem;
    padding: 1.25rem 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    border: 1px solid var(--border-color);
    margin-bottom: 0.25rem;
  }
  
  .collection-item:hover {
    transform: translateY(-0.25rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }
  
  .collection-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
    color: white;
    position: relative;
    overflow: hidden;
  }
  
  .collection-icon::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .collection-item:hover .collection-icon::before {
    opacity: 1;
  }
  
  .collection-icon.daily {
    background: var(--primary-color);
  }
  
  .collection-icon.weekly {
    background: var(--accent-color);
  }
  
  .collection-icon.monthly {
    background: var(--success-color);
  }
  
  .collection-details h3 {
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0 0 0.5rem;
    color: var(--text-secondary);
  }
  
  .collection-amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    letter-spacing: -0.025em;
  }
  
  .collection-amount .currency-symbol {
    font-size: 1rem;
    font-weight: 500;
    margin-right: 0.125rem;
    opacity: 0.7;
  }
  
  .collection-trend {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    display: inline-block;
  }
  
  .collection-trend.positive {
    color: var(--success-color);
    background: rgba(0, 202, 141, 0.1);
  }

  /* Estilos para la información del cliente */
  .client-info-card {
    background: var(--surface);
    border-radius: 1rem;
    padding: 1.5rem;
    margin: 0 1rem;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .client-info-card:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }

  .client-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .client-avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.2rem;
    box-shadow: 0 2px 8px rgba(58, 102, 255, 0.2);
  }

  .client-main-info {
    flex: 1;
    min-width: 0;
  }

  .client-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .client-subscriber {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .client-status {
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .client-status.active {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
    border: 1px solid rgba(0, 202, 141, 0.2);
  }

  .client-status.inactive {
    background: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
    border: 1px solid rgba(233, 58, 74, 0.2);
  }

  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.875rem;
    min-width: 80px;
  }

  .detail-value {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }

  .client-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(58, 102, 255, 0.05);
    border-radius: 0.5rem;
    border-left: 3px solid var(--primary-color);
  }

  .client-message p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-primary);
    font-style: italic;
  }

  .loading-client-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 1rem;
    color: var(--text-secondary);
    text-align: center;
    font-size: 0.9rem;
  }

  .empty-client-info {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    padding: 1.5rem 1rem;
  }

  .load-client-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 1rem;
  }

  .load-client-button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(58, 102, 255, 0.3);
  }

  .load-client-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(58, 102, 255, 0.2);
  }

  /* Responsive para información del cliente */
  @media (max-width: 768px) {
    .client-info-card {
      margin: 0 0.75rem;
      padding: 1.25rem;
    }

    .client-header {
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .client-avatar {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1rem;
    }

    .client-name {
      font-size: 1rem;
    }

    .client-subscriber {
      font-size: 0.8rem;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .detail-value {
      max-width: 100%;
      text-align: left;
    }
  }

  /* Estilos para verificación de estado QR */
  .qr-status-form {
    padding: 0 1rem;
    margin-bottom: 1rem;
  }

  .input-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .qr-id-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: var(--surface);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .qr-id-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(58, 102, 255, 0.1);
  }

  .qr-id-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .check-qr-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .check-qr-button:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(58, 102, 255, 0.3);
  }

  .check-qr-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .loading-qr-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 1rem;
    color: var(--text-secondary);
    text-align: center;
    font-size: 0.9rem;
  }

  .qr-status-card {
    background: var(--surface);
    border-radius: 1rem;
    padding: 1.5rem;
    margin: 0 1rem;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .qr-status-card:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }

  .qr-status-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .qr-status-info {
    flex: 1;
    min-width: 0;
  }

  .qr-id {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .qr-amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0;
  }

  .qr-status-badge {
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .qr-status-badge.active {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
    border: 1px solid rgba(0, 202, 141, 0.2);
  }

  .qr-status-badge.paid {
    background: rgba(58, 102, 255, 0.1);
    color: var(--primary-color);
    border: 1px solid rgba(58, 102, 255, 0.2);
  }

  .qr-status-badge.expired {
    background: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
    border: 1px solid rgba(233, 58, 74, 0.2);
  }

  .qr-status-badge.cancelled {
    background: rgba(107, 114, 128, 0.1);
    color: var(--text-secondary);
    border: 1px solid rgba(107, 114, 128, 0.2);
  }

  .qr-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .qr-payments {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }

  .qr-payments h4 {
    margin: 0 0 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .payments-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .payment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(0, 202, 141, 0.05);
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 202, 141, 0.1);
  }

  .payment-info {
    flex: 1;
    min-width: 0;
  }

  .payment-amount {
    font-weight: 600;
    color: var(--success-color);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .payment-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .payment-status {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .payment-status.paid {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }

  .no-payments, .no-qr-status {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    padding: 1.5rem 1rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
  }

  /* Responsive para verificación QR */
  @media (max-width: 768px) {
    .qr-status-form {
      padding: 0 0.75rem;
    }

    .input-group {
      flex-direction: column;
      gap: 0.5rem;
    }

    .qr-id-input {
      width: 100%;
    }

    .check-qr-button {
      width: 100%;
    }

    .qr-status-card {
      margin: 0 0.75rem;
      padding: 1.25rem;
    }

    .qr-status-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .qr-status-badge {
      align-self: flex-start;
    }

    .payment-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .payment-status {
      align-self: flex-end;
    }
  }
  
  
  /* Transacciones */
  .transactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
  }
  
  .transaction-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem;
    background: var(--surface);
    border-radius: 0.75rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    margin-bottom: 0.5rem;
  }
  
  .transaction-item.simple {
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .transaction-item:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }
  
  .transaction-item.simple:hover {
    background: linear-gradient(135deg, var(--surface) 0%, rgba(0, 202, 141, 0.02) 100%);
    border-color: rgba(0, 202, 141, 0.2);
  }
  
  .transaction-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  
  .transaction-icon.incoming {
    background: linear-gradient(135deg, rgba(0, 202, 141, 0.15) 0%, rgba(0, 202, 141, 0.05) 100%);
    color: var(--success-color);
    border: 1px solid rgba(0, 202, 141, 0.2);
  }
  
  
  
  .transaction-details {
    flex: 1;
    min-width: 0;
  }
  
  .transaction-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .transaction-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
  
  .transaction-amount {
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
  }
  
  .transaction-amount.income {
    color: var(--success-color);
    background: rgba(0, 202, 141, 0.1);
  }
  
  
  /* Compactar header y botones para evitar wrap */
  .compact-header {
    gap: 0.5rem;
    flex-wrap: nowrap;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.5rem;
    height: 2rem; /* Altura fija para mejor alineación */
  }
  .compact-title {
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 0.5rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--text-secondary);
    opacity: 0.85;
    margin: 0; /* Eliminar margen para mejor alineación vertical */
    line-height: 2rem; /* Alineación vertical */
  }
  .compact-view {
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    min-width: 0;
    flex-shrink: 0;
    gap: 0.25rem;
    height: 2rem;
    display: flex;
    align-items: center;
  }
  
  /* Ajustes para los iconos de Lucide */
  :global(.action-icon svg, .transaction-icon svg) {
    stroke-width: 1.75px;
  }

  /* Estilos para loading y errores en transacciones */
  .loading-transactions {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    gap: 1rem;
    color: var(--text-secondary);
    text-align: center;
    font-size: 0.9rem;
  }
  
  .loading-spinner.mini {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  
  .empty-transactions {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    padding: 1.5rem 0;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Loading Placeholders */
  .loading-placeholders {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
  }
  
  .wallet-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .stats-placeholders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .movements-placeholder {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .placeholder-skeleton {
    background: var(--border-color);
    border-radius: var(--border-radius);
    position: relative;
    overflow: hidden;
  }
  
  .placeholder-skeleton::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
  
  .balance-skeleton {
    width: 120px;
    height: 24px;
  }
  
  .account-skeleton {
    width: 100px;
    height: 16px;
  }
  
  .stat-skeleton {
    height: 80px;
    border-radius: var(--border-radius-lg);
  }
  
  .movement-skeleton {
    height: 60px;
    border-radius: var(--border-radius-md);
  }
  
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  
  /* Responsive placeholders */
  @media (max-width: 768px) {
    .loading-placeholders {
      gap: 1rem;
      padding: 0.75rem;
    }
    
    .stats-placeholders {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.75rem;
    }
    
    .stat-skeleton {
      height: 70px;
    }
    
    .movement-skeleton {
      height: 50px;
    }
  }
  
  /* Estilos del Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background: var(--surface);
    border-radius: 1rem;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    background: var(--surface);
    border-radius: 1rem 1rem 0 0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }
  
  .modal-close:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .movement-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-section h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
  }
  
  .detail-label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .detail-value {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    text-align: right;
    max-width: 60%;
    word-break: break-word;
  }
  
  .detail-value.amount {
    color: var(--success-color);
    font-size: 1rem;
  }
  
  .detail-value.code {
    font-family: 'Courier New', monospace;
    background: rgba(0, 202, 141, 0.1);
    color: var(--primary-color);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
  }
  
  @media (max-width: 640px) {
    .modal-content {
      margin: 0.5rem;
      max-height: 90vh;
    }
    
    .modal-header {
      padding: 1rem;
      flex-shrink: 0;
    }
    
    .modal-body {
      padding: 1rem;
      overflow-y: auto;
      flex: 1;
    }
    
    .detail-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .detail-value {
      max-width: 100%;
      text-align: left;
    }
  }
</style>
