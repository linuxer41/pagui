<script lang="ts">
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  import { auth } from '$lib/stores/auth';
  import {
      ArrowDownLeft,
      ArrowUpRight,
      BarChart3,
      Calendar,
      CalendarDays,
      ChevronRight,
      Clock,
      Plus,
      QrCode,
      RefreshCw,
      Send,
      Wallet
  } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Transaction } from '$lib/api';

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
      if (response.responseCode === 0) {
        wallet.transactions = response.transactions;
      } else {
        throw new Error('Error al obtener transacciones recientes');
      }
    } catch (error) {
      console.error('Error al cargar transacciones recientes:', error);
      transactionsError = true;
    } finally {
      loadingTransactions = false;
    }
  }

  // Función para actualizar saldo y transacciones
  function handleRefresh() {
    loadRecentTransactions();
    // Simular actualización del saldo (en producción esto vendría de la API)
    const newBalance = wallet.balance + Math.random() * 100 - 50; // Fluctuación aleatoria de ±50
    wallet.balance = Math.max(0, newBalance); // Asegurarse de que no sea negativo
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

<MainPage>
  <!-- Encabezado con saldo principal -->
  <div class="wallet-header" in:fly={{ y: -40, duration: 500 }} out:fade={{ duration: 300 }}>
    <button class="refresh-button" aria-label="Actualizar saldo" in:fade={{ duration: 400 }} on:click={handleRefresh}>
      <RefreshCw size={16} />
    </button>
    <div class="balance-section">
      <p class="balance-label" in:fade={{ duration: 400 }}>Saldo disponible</p>
      <div class="balance-refresh">
        <h1 class="balance-amount" in:scale={{ duration: 500, start: 0.8 }}>
          <span class="currency-symbol">{wallet.currency}</span>
          <span in:scale={{ duration: 600, easing: cubicOut }}>
            {#if $animatedBalance !== undefined}
              {formatCurrency($animatedBalance)}
            {:else}
              {formatCurrency(wallet.balance)}
            {/if}
          </span>
        </h1>
      </div>
    </div>
    <!-- Acciones rápidas tipo barra moderna -->
    <div class="quick-actions" in:fly={{ y: 30, duration: 500, delay: 100 }}>
      <button class="action-bar-button" on:click={handleGenerarQR} in:scale={{ duration: 400, delay: 100 }}>
        <span class="action-icon"><QrCode size={16} /></span>
        Cobrar
      </button>
      <button class="action-bar-button" in:scale={{ duration: 400, delay: 200 }}>
        <span class="action-icon"><Send size={16} /></span>
        Enviar
      </button>
      <button class="action-bar-button" on:click={handleVerPagos} in:scale={{ duration: 400, delay: 300 }}>
        <span class="action-icon"><BarChart3 size={16} /></span>
        Historial
      </button>
    </div>
  </div>
  <!-- Sección de Resumen de Recaudaciones -->
  <div class="section collections-section" in:fade={{ duration: 500 }}>
    <div class="section-header compact-header">
      <h2 class="compact-title">Resumen de Recaudaciones</h2>
      <button class="view-all-button compact-view" on:click={() => goto('/resume')}>Ver detalles <ChevronRight size={16} /></button>
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
</MainPage>

<style>
  
  /* Encabezado con saldo */
  :global(.main-page-wrapper) {
    padding-top: 0px !important;
    padding-bottom: 0px !important;
  }
  /* HEADER MODERNO Y ELEGANTE */
  .wallet-header {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    padding: 1.2rem 1rem 1.2rem;
    color: white;
    margin-bottom: 1.5rem;
    padding-top: max(1.2rem, calc(constant(safe-area-inset-top) + 1.2rem));
    padding-top: max(1.2rem, calc(env(safe-area-inset-top) + 1.2rem));
    position: sticky;
    top: 0;
    z-index: 100;
    border-radius: 0 0 1.2rem 1.2rem;
    box-shadow: 0 6px 32px 0 rgba(58,102,255,0.10);
    overflow: visible;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.2rem;
  }
  .balance-section {
    text-align: center;
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .balance-label {
    font-size: 0.8rem;
    opacity: 0.8;
    margin: 0 0 0.25rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: white;
  }
  .balance-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
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
    color: white;
  }
  .currency-symbol {
    font-size: 1.1rem;
    font-weight: 500;
    margin-right: 0.1rem;
    opacity: 0.7;
    color: white;
  }
  .refresh-button {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    in: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    backdrop-filter: blur(8px);
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 5;
  }
  .refresh-button:hover {
    background: rgba(255, 255, 255, 0.22);
    transform: rotate(180deg) scale(1.05);
    border-color: rgba(255, 255, 255, 0.28);
  }

  /* ACCIONES RÁPIDAS REDISEÑADAS */
  .quick-actions {
    display: flex;
    flex-direction: row;
    gap: 0.4rem;
    justify-content: center;
    margin-top: 0.2rem;
  }
  .action-bar-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.12);
    color: white;
    font-weight: 500;
    font-size: 0.8rem;
    border-radius: 1.2rem;
    padding: 0.4rem 0.7rem;
    cursor: pointer;
    in: all 0.25s ease;
    box-shadow: 0 2px 6px 0 rgba(0,0,0,0.05);
    outline: none;
    backdrop-filter: blur(8px);
    letter-spacing: 0.02em;
  }
  .action-bar-button:hover {
    background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.12));
    color: white;
    border-color: rgba(255,255,255,0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px 0 rgba(0,0,0,0.08);
  }
  .action-bar-button:active {
    transform: translateY(1px);
    box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);
  }
  .action-bar-button .action-icon {
    margin-bottom: 0;
    margin-right: 0.15rem;
    background: none;
    border: none;
    width: 1.2rem;
    height: 1.2rem;
    color: inherit;
    box-shadow: none;
    padding: 0;
    opacity: 0.9;
  }

  /* Sección de recaudaciones */
  .collections-section, .transactions-section {
    margin-bottom: 2rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
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
    in: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    border: 1px solid var(--border-color);
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
    font-weight: 500;
  }
  
  .collection-trend.positive {
    color: var(--success-color);
  }
  
  .collection-trend.negative {
    color: var(--error-color);
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
    padding: 1rem;
    background: var(--surface);
    border-radius: 0.75rem;
    in: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
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
  }
  
  .transaction-amount.income {
    color: var(--success-color);
  }
  
  .transaction-amount.expense {
    color: var(--error-color);
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
