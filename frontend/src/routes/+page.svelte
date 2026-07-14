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
  
  function getInitials(name: string | undefined | null): string {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P'
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

<div class="home safe-top">
  <!-- Header -->
  <header class="home-header">
    <div class="header-left">
      <h1 class="app-title">Pagui</h1>
      <span class="sse-badge" class:sse-connected={$sseConnection.isConnected} class:sse-error={$sseConnection.error} title={$sseConnection.isConnected ? 'Conectado' : $sseConnection.error || 'Desconectado'}>
        {#if $sseConnection.isConnected}
          <Wifi size={10} />
        {:else}
          <WifiOff size={10} />
        {/if}
      </span>
    </div>
    <button class="header-avatar" on:click={() => goto('/profile')}>
      {getInitials($auth.user?.fullName || '')}
    </button>
  </header>

  {#if loading}
    <!-- Loading skeleton -->
    <div class="loading-state">
      <div class="skeleton skeleton-balance"></div>
      <div class="skeleton skeleton-actions"></div>
      <div class="skeleton skeleton-stats"></div>
      <div class="skeleton skeleton-tx"></div>
    </div>
  {:else}
    <!-- Balance Card -->
    <div class="balance-card" in:fly={{ y: -20, duration: 500 }}>
      <div class="balance-glow"></div>
      <div class="balance-top">
        <span class="balance-label">Saldo disponible</span>
        {#if allAccounts.length > 1}
          <div class="balance-accounts">
            {#each allAccounts as acc (acc.id)}
              <button class="acc-dot" class:active={selectedAccountId === acc.id} on:click={() => switchAccount(acc.id)} title={acc.accountNumber}></button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="balance-main">
        <span class="balance-symbol">{getCurrencySymbol(wallet.currency)}</span>
        <span class="balance-amount" in:scale={{ duration: 600, easing: cubicOut }}>
          {formatCurrency($animatedBalance ?? wallet.balance)}
        </span>
      </div>
      {#if currentAccount}
        <div class="balance-account">{currentAccount.accountNumber}</div>
      {/if}
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions animate-slide-up" style="animation-delay: 100ms">
      <button class="qa-btn" on:click={handleGenerarQR}>
        <div class="qa-icon qr-icon"><QrCode size={22} /></div>
        <span class="qa-label">Cobrar</span>
      </button>
      <button class="qa-btn" on:click={() => goto('/transfers/p2p')}>
        <div class="qa-icon send-icon"><ArrowUpRight size={22} /></div>
        <span class="qa-label">Enviar</span>
      </button>
      <button class="qa-btn" on:click={() => goto('/transfers')}>
        <div class="qa-icon history-icon"><ClipboardList size={22} /></div>
        <span class="qa-label">Historial</span>
      </button>
      <button class="qa-btn" on:click={() => goto('/profile')}>
        <div class="qa-icon more-icon"><ChevronRight size={22} /></div>
        <span class="qa-label">Más</span>
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid animate-slide-up" style="animation-delay: 200ms">
      <div class="stat-card">
        <div class="stat-icon stat-icon-primary"><Clock size={16} /></div>
        <div class="stat-body">
          <span class="stat-label">Hoy</span>
          <span class="stat-value">{formatCurrency(collections.daily)}</span>
        </div>
        <span class="stat-trend {growthPercentages.daily >= 0 ? 'up' : 'down'}">{growthPercentages.daily >= 0 ? '+' : ''}{growthPercentages.daily.toFixed(1)}%</span>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-accent"><Calendar size={16} /></div>
        <div class="stat-body">
          <span class="stat-label">Semana</span>
          <span class="stat-value">{formatCurrency(collections.weekly)}</span>
        </div>
        <span class="stat-trend {growthPercentages.weekly >= 0 ? 'up' : 'down'}">{growthPercentages.weekly >= 0 ? '+' : ''}{growthPercentages.weekly.toFixed(1)}%</span>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-success"><CalendarDays size={16} /></div>
        <div class="stat-body">
          <span class="stat-label">Mes</span>
          <span class="stat-value">{formatCurrency(collections.monthly)}</span>
        </div>
        <span class="stat-trend {growthPercentages.monthly >= 0 ? 'up' : 'down'}">{growthPercentages.monthly >= 0 ? '+' : ''}{growthPercentages.monthly.toFixed(1)}%</span>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section-header">
      <h2 class="section-title">Movimientos recientes</h2>
      <button class="section-link" on:click={() => goto('/transactions')}>Ver todo</button>
    </div>
    <div class="tx-list animate-slide-up" style="animation-delay: 300ms">
      {#if loadingStats}
        <div class="loading-row"><span>Cargando...</span></div>
      {:else if accountMovements.length === 0}
        <div class="empty-row">No hay movimientos recientes</div>
      {:else}
        {#each accountMovements.slice(0, 5) as movement, i (movement.id)}
          <button class="tx-row" on:click={() => openMovementModal(movement)}>
            <div class="tx-icon">
              {#if movement.movement_type === 'deposit' || movement.movement_type === 'transfer_in'}
                <ArrowDownLeft size={16} />
              {:else}
                <ArrowUpRight size={16} />
              {/if}
            </div>
            <div class="tx-info">
              <span class="tx-name">{movement.senderName || movement.description || 'Movimiento'}</span>
              <span class="tx-date">{formatDate(movement.createdAt)}</span>
            </div>
            <span class="tx-amount" class:tx-in={movement.movement_type === 'deposit' || movement.movement_type === 'transfer_in'}>
              {movement.movement_type === 'deposit' || movement.movement_type === 'transfer_in' ? '+' : '-'}{getCurrencySymbol(movement.currency || wallet.currency)}{formatCurrency(movement.amount)}
            </span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
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
  /* ── Home Layout ── */
  .home {
    max-width: 480px;
    margin: 0 auto;
    padding: 0 var(--space-4) var(--space-8);
    min-height: 100dvh;
  }

  /* ── Header ── */
  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) 0 var(--space-3);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .app-title {
    font-size: var(--text-2xl);
    font-weight: 800;
    letter-spacing: var(--tracking-tight);
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sse-badge {
    display: inline-flex;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    align-items: center;
    justify-content: center;
    background: var(--success-bg);
    color: var(--success-color);
    transition: all var(--duration-fast) var(--ease-out);
  }
  .sse-badge.sse-connected { background: var(--success-bg); color: var(--success-color); }
  .sse-badge.sse-error { background: var(--error-bg); color: var(--error-color); }
  .header-avatar {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    background: var(--primary-gradient);
    color: white;
    border: none;
    font-size: var(--text-sm);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    transition: all var(--duration-fast) var(--ease-out);
  }
  .header-avatar:active { transform: scale(0.92); }

  /* ── Balance Card ── */
  .balance-card {
    position: relative;
    background: var(--primary-gradient);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    margin-bottom: var(--space-5);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
  }
  .balance-glow {
    position: absolute;
    top: -50%;
    right: -30%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
  .balance-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .balance-label {
    font-size: var(--text-sm);
    color: rgba(255,255,255,0.75);
    font-weight: 500;
  }
  .balance-accounts { display: flex; gap: 6px; }
  .acc-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    border: 2px solid rgba(255,255,255,0.4);
    background: transparent;
    padding: 0;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .acc-dot.active { background: white; border-color: white; }
  .balance-main {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    margin-bottom: var(--space-1);
  }
  .balance-symbol {
    font-size: var(--text-xl);
    font-weight: 600;
    color: rgba(255,255,255,0.85);
  }
  .balance-amount {
    font-size: var(--text-4xl);
    font-weight: 800;
    color: white;
    letter-spacing: var(--tracking-tight);
    line-height: 1;
  }
  .balance-account {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.1em;
  }

  /* ── Quick Actions ── */
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }
  .qa-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-3) var(--space-2);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    box-shadow: var(--shadow-xs);
  }
  .qa-btn:active { transform: scale(0.95); }
  .qa-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  .qr-icon { background: var(--primary-gradient); }
  .send-icon { background: var(--accent-gradient); }
  .history-icon { background: linear-gradient(135deg, #10B981, #059669); }
  .more-icon { background: var(--surface-hover); color: var(--text-secondary); border: 1px solid var(--border); }
  .qa-label {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* ── Stats Grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    box-shadow: var(--shadow-xs);
  }
  .stat-icon {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  .stat-icon-primary { background: var(--primary-gradient); }
  .stat-icon-accent { background: var(--accent-gradient); }
  .stat-icon-success { background: linear-gradient(135deg, #10B981, #059669); }
  .stat-body { display: flex; flex-direction: column; gap: 2px; }
  .stat-label { font-size: var(--text-xs); color: var(--text-tertiary); font-weight: 500; }
  .stat-value { font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); }
  .stat-trend {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    align-self: flex-start;
  }
  .stat-trend.up { background: var(--success-bg); color: var(--success-color); }
  .stat-trend.down { background: var(--error-bg); color: var(--error-color); }

  /* ── Section Header ── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .section-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: var(--tracking-tight);
  }
  .section-link {
    background: none;
    border: none;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--primary-color);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-out);
  }
  .section-link:hover { background: var(--primary-subtle); }

  /* ── Transaction List ── */
  .tx-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .tx-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    width: 100%;
    text-align: left;
  }
  .tx-row:hover { border-color: var(--primary-color); background: var(--primary-subtle); }
  .tx-row:active { transform: scale(0.985); }
  .tx-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--primary-subtle);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .tx-info {
    flex: 1;
    min-width: 0;
  }
  .tx-name {
    display: block;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tx-date {
    display: block;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-top: 2px;
  }
  .tx-amount {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--error-color);
    flex-shrink: 0;
  }
  .tx-amount.tx-in { color: var(--success-color); }

  /* ── Loading State ── */
  .loading-state { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4) 0; }
  .skeleton { border-radius: var(--radius-lg); }
  .skeleton-balance { height: 160px; }
  .skeleton-actions { height: 80px; }
  .skeleton-stats { height: 80px; }
  .skeleton-tx { height: 200px; }

  .loading-row, .empty-row {
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
  }
  .modal-content {
    background: var(--surface);
    border-radius: var(--radius-2xl);
    max-width: 480px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border);
    animation: scaleIn 250ms var(--ease-spring);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5);
    border-bottom: 1px solid var(--border);
  }
  .modal-header h2 { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin: 0; }
  .modal-close {
    width: 32px;
    height: 32px;
    border: none;
    background: var(--surface-hover);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .modal-close:hover { background: var(--border); color: var(--text-primary); }
  .modal-body { padding: var(--space-5); overflow-y: auto; flex: 1; }
  .movement-details { display: flex; flex-direction: column; gap: var(--space-5); }
  .detail-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .detail-section h3 {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border);
    margin: 0;
  }
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }
  .detail-label { font-weight: 500; color: var(--text-secondary); font-size: var(--text-sm); }
  .detail-value { font-weight: 600; color: var(--text-primary); font-size: var(--text-sm); text-align: right; max-width: 60%; word-break: break-word; }
  .detail-value.amount { color: var(--success-color); font-size: var(--text-base); }
  .detail-value.code { font-family: var(--font-mono); background: var(--primary-subtle); color: var(--primary-color); padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); }

  @media (max-width: 400px) {
    .quick-actions { gap: var(--space-2); }
    .qa-btn { padding: var(--space-2) var(--space-1); }
    .qa-icon { width: 38px; height: 38px; }
    .stats-grid { gap: var(--space-2); }
    .stat-card { padding: var(--space-3) var(--space-2); }
    .balance-amount { font-size: var(--text-3xl); }
  }
</style>
