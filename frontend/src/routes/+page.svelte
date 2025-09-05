<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Transaction } from '$lib/api';
  import api from '$lib/api';
  import {
      ArrowDownLeft,
      ArrowUpRight,
      Calendar,
      CalendarDays,
      ChevronRight,
      ClipboardList,
      Clock,
      QrCode,
      RefreshCw
  } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { tweened } from 'svelte/motion';
  import { fade, fly, scale } from 'svelte/transition';

  // Variables para estadísticas y datos de la billetera
  let stats = {
    pendientes: 0,
    pagados: 0,
    cancelados: 0,
    total: 0
  };
  
  // Datos de la billetera
  let wallet = {
    balance: 2450.75,
    currency: 'USD',
    transactions: [] as Transaction[]
  };
  
  // Datos de recaudaciones por periodo
  let collections = {
    daily: 450.25,
    weekly: 2750.80,
    monthly: 8420.35
  };
  
  let loading = true;
  let loadingTransactions = true;
  let transactionsError = false;

  // Verificar autenticación y cargar datos
  onMount(async () => {
    
    try {
      // Cargar estadísticas de QR
      const today = new Date().toISOString().split('T')[0];
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      
      const filters = {
        startDate: lastMonthStr,
        endDate: today
      };
      
      // Cargar todos los QR
      const response = await api.listQRs(filters);
      
      if (response.responseCode === 0 && response.qrList) {
        const qrList = response.qrList;
        stats.total = qrList.length;
        
        // Contar por estado
        stats.pendientes = qrList.filter((qr: any) => qr.status === 'PENDIENTE').length;
        stats.pagados = qrList.filter((qr: any) => qr.status === 'PAGADO').length;
        stats.cancelados = qrList.filter((qr: any) => qr.status === 'CANCELADO').length;
      }
      
      // Cargar transacciones recientes
      await loadRecentTransactions();
      
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    } finally {
      loading = false;
    }
  });

  // Función para cargar las transacciones recientes
  async function loadRecentTransactions() {
    loadingTransactions = true;
    transactionsError = false;
    
    try {
      const response = await api.getRecentTransactions(3);
      if (!response.success) {
        throw new Error('Error al obtener transacciones recientes');
      }
      wallet.transactions = response.data?.transactions || [];
    } catch (error) {
      console.error('Error al cargar transacciones recientes:', error);
      transactionsError = true;
    } finally {
      loadingTransactions = false;
    }
  }


  function handleGenerarQR() {
    goto('/qr');
  }

  function handleVerPagos() {
    goto('/transactions');
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
    
    <!-- Saldo disponible en el header -->
    <div class="header-balance" in:fly={{ y: -20, duration: 500 }}>
      <div class="balance-content">
        <p class="balance-label" in:fade={{ duration: 400 }}>Saldo disponible</p>
        <h1 class="balance-amount" in:scale={{ duration: 500, start: 0.9 }}>
          <span class="currency-symbol">{wallet.currency}</span>
          <span class="balance-value" in:scale={{ duration: 600, easing: cubicOut }}>
            {#if $animatedBalance !== undefined}
              {formatCurrency($animatedBalance)}
            {:else}
              {formatCurrency(wallet.balance)}
            {/if}
          </span>
        </h1>
      </div>
    </div>
    
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
          <div class="collection-trend positive">+12.5%</div>
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
          <div class="collection-trend positive">+8.2%</div>
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
          <div class="collection-trend positive">+15.8%</div>
        </div>
      </div>
    </div>
  </div>
  <!-- Transacciones recientes -->
  <div class="section transactions-section" in:fade={{ duration: 500, delay: 100 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Transacciones recientes</h2>
      <button class="view-all-button compact-view" on:click={() => goto('/transactions')}>Ver todas <ChevronRight size={16} /></button>
    </div>
    <div class="transactions-list">
      {#if loadingTransactions}
        <div class="loading-transactions">
          <div class="loading-spinner mini"></div>
          <span>Cargando transacciones...</span>
        </div>
      {:else if transactionsError}
        <div class="error-message">
          <p>Error al cargar transacciones.</p>
          <button class="retry-button small" on:click={loadRecentTransactions}>
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      {:else if wallet.transactions.length === 0}
        <div class="empty-transactions">
          <p>No hay transacciones recientes</p>
        </div>
      {:else}
        {#each wallet.transactions as tx, i (tx.id)}
          <div class="transaction-item" in:fly={{ y: 20, duration: 400, delay: 100 + i * 80 }}>
            <div class="transaction-icon {tx.type === 'incoming' ? 'incoming' : 'outgoing'}">
              {#if tx.type === 'incoming'}
                <ArrowDownLeft size={18} />
              {:else}
                <ArrowUpRight size={18} />
              {/if}
            </div>
            <div class="transaction-details">
              <div class="transaction-title" style="font-size:0.85rem;">{tx.type === 'incoming' ? (tx.from || 'Ingreso') : (tx.to || 'Pago')}</div>
              <div class="transaction-date">{formatDate(tx.date)}</div>
            </div>
            <div class="transaction-amount {tx.type === 'incoming' ? 'income' : 'expense'}">
              {tx.type === 'incoming' ? '+' : '-'} {wallet.currency} <span in:scale={{ duration: 500 }}>{formatCurrency(tx.amount)}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
  </div>
</div>

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
  
  /* Saldo en el header */
  .header-balance {
    text-align: center;
    margin-bottom: 0.75rem;
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
  .balance-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .balance-label {
    font-size: 0.75rem;
    margin: 0 0 0.25rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  
  .balance-amount {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
    line-height: 1;
    letter-spacing: -0.025em;
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }
  
  .balance-value {
    color: var(--primary-color);
  }
  
  .currency-symbol {
    font-size: 1rem;
    font-weight: 500;
    margin-right: 0.1rem;
    color: var(--text-secondary);
  }
  
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.25rem;
  }

  /* Sección de recaudaciones */
  .collections-section, .transactions-section {
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
    in: all 0.2s ease;
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
    in: opacity 0.3s ease;
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
  
  .collection-trend.negative {
    color: var(--error-color);
    background: rgba(233, 58, 74, 0.1);
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
  
  .transaction-item:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }
  
  .transaction-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .transaction-icon.incoming {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }
  
  .transaction-icon.outgoing {
    background: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
  }
  
  .transaction-details {
    flex: 1;
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
  
  .transaction-amount.expense {
    color: var(--error-color);
    background: rgba(233, 58, 74, 0.1);
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
  
  .error-message {
    text-align: center;
    padding: 1rem;
    color: var(--error-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  
  .error-message p {
    margin: 0;
    font-size: 0.9rem;
  }
  
  .retry-button.small {
    background: var(--surface);
    color: var(--primary-color);
    border: 1px solid var(--border-color);
    padding: 0.4rem 0.8rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.2s ease;
  }
  
  .retry-button.small:hover {
    background: var(--surface-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
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
</style>
