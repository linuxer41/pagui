<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { scale, fly, fade } from 'svelte/transition'
  import TransactionItem from '$lib/components/TransactionItem.svelte'
  import NotificationToast from '$lib/components/NotificationToast.svelte'
  import {
    Send, Download, QrCode, History, MoreHorizontal,
    TrendingUp, DollarSign, Activity
  } from '@lucide/svelte'

  let balance = 0
  let availableBalance = 0
  let accounts: any[] = []
  let transactions: any[] = []
  let stats = { today: 0, week: 0, month: 0, growth: { today: 0, week: 0, month: 0 } }
  let loading = true
  let selectedAccount = 0
  let showAllTransactions = false
  let userName = 'Usuario'

  onMount(async () => {
    try {
      const [balRes, txRes] = await Promise.allSettled([
        api.getAccounts(),
        api.getRecentTransactions(10),
      ])
      if (balRes.status === 'fulfilled' && balRes.value.success) {
        accounts = balRes.value.data || []
        if (accounts.length > 0) {
          balance = Number(accounts[0].balance) || 0
          availableBalance = Number(accounts[0].available_balance) || 0
        }
      }
      if (txRes.status === 'fulfilled' && txRes.value.success && txRes.value.data) {
        transactions = (txRes.value.data as any).transactions || []
      }
    } catch {}
    finally { loading = false }
  })
</script>

<div class="home-page safe-top">
  <NotificationToast />

  <!-- Header -->
  <header class="home-header animate-slide-up">
    <div class="header-left">
      <p class="greeting">Hola, {userName}</p>
      <p class="subtitle">Bienvenido a tu billetera</p>
    </div>
    <button class="avatar-btn" onclick={() => goto('/profile')}>
      <span class="avatar-initials">P</span>
    </button>
  </header>

  <!-- Balance Card -->
  {#if loading}
    <div class="wallet-card-skeleton animate-pulse" />
  {:else}
    <div class="wallet-card animate-scale-in" style="animation-delay: 100ms">
      <div class="balance-header">
        <span class="balance-label">Balance disponible</span>
        <button class="more-btn" onclick={() => goto('/wallet')} aria-label="Ver billeteras">
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div class="balance-amount">
        Bs. {balance.toFixed(2)}
      </div>
      <div class="balance-sub">
        Disponible: Bs. {availableBalance.toFixed(2)}
      </div>
      {#if accounts.length > 1}
        <div class="account-dots">
          {#each accounts as _, i}
            <button
              class="dot"
              class:active={i === selectedAccount}
              onclick={() => selectedAccount = i}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Quick Actions -->
  <div class="action-grid animate-fade-in" style="animation-delay: 200ms">
    <button class="action-btn" onclick={() => goto('/transfers/p2p')}>
      <div class="action-icon" style="background: #EEF2FF; color: #4F46E5;">
        <Send size={20} />
      </div>
      <span class="action-label">Enviar</span>
    </button>
    <button class="action-btn" onclick={() => goto('/transfers/p2p')}>
      <div class="action-icon" style="background: #ECFDF5; color: #10B981;">
        <Download size={20} />
      </div>
      <span class="action-label">Recibir</span>
    </button>
    <button class="action-btn" onclick={() => goto('/qr/generate')}>
      <div class="action-icon" style="background: #FEF3C7; color: #F59E0B;">
        <QrCode size={20} />
      </div>
      <span class="action-label">Pagar QR</span>
    </button>
    <button class="action-btn" onclick={() => goto('/transactions')}>
      <div class="action-icon" style="background: #F3E8FF; color: #7C3AED;">
        <History size={20} />
      </div>
      <span class="action-label">Historial</span>
    </button>
  </div>

  <!-- Stats -->
  {#if stats}
    <div class="section-card animate-fade-in" style="animation-delay: 300ms">
      <h3 class="section-card-title">Resumen de hoy</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon" style="background: var(--primary-subtle); color: var(--primary-color);">
            <TrendingUp size={16} />
          </div>
          <div class="stat-info">
            <span class="stat-num">Bs. {stats.today.toFixed(2)}</span>
            <span class="stat-label">Hoy</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon" style="background: var(--success-bg); color: var(--success-color);">
            <DollarSign size={16} />
          </div>
          <div class="stat-info">
            <span class="stat-num">Bs. {stats.week.toFixed(2)}</span>
            <span class="stat-label">Esta semana</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning-color);">
            <Activity size={16} />
          </div>
          <div class="stat-info">
            <span class="stat-num">Bs. {stats.month.toFixed(2)}</span>
            <span class="stat-label">Este mes</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Recent Transactions -->
  <div class="tx-section animate-fade-in" style="animation-delay: 400ms">
    <div class="tx-header">
      <h3 class="section-card-title">Transacciones recientes</h3>
      <button class="see-all-btn" onclick={() => goto('/transactions')}>
        Ver todo
      </button>
    </div>
    {#if loading}
      <div class="skeleton-list">
        <div class="skeleton skeleton-row" />
        <div class="skeleton skeleton-row" />
        <div class="skeleton skeleton-row" />
      </div>
    {:else if transactions.length === 0}
      <div class="empty-tx">
        <History size={32} />
        <p>No hay transacciones recientes</p>
      </div>
    {:else}
      <div class="tx-list">
        {#each showAllTransactions ? transactions : transactions.slice(0, 3) as tx, i (tx.id)}
          <div class="animate-slide-up" style="animation-delay: {500 + i * 80}ms">
            <TransactionItem transaction={tx} />
          </div>
        {/each}
      </div>
      {#if transactions.length > 3}
        <button class="show-more-btn" onclick={() => showAllTransactions = !showAllTransactions}>
          {showAllTransactions ? 'Mostrar menos' : `Ver ${transactions.length - 3} más`}
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .home-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    padding-bottom: calc(80px + var(--nav-bottom));
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
  }

  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .greeting {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: var(--tracking-tight);
  }
  .subtitle {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    margin-top: 2px;
  }
  .avatar-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: var(--primary-gradient);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring);
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
  }
  .avatar-btn:active { transform: scale(0.92); }
  .avatar-initials {
    color: white;
    font-weight: 700;
    font-size: var(--text-base);
  }

  .wallet-card-skeleton {
    height: 160px;
    background: linear-gradient(135deg, var(--border) 25%, var(--surface-hover) 50%, var(--border) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-2xl);
  }

  .balance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }
  .more-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    border: none;
    background: rgba(255,255,255,0.15);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .more-btn:active { transform: scale(0.9); }

  .account-dots {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: rgba(255,255,255,0.3);
    border: none;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    padding: 0;
  }
  .dot.active { background: white; width: 24px; border-radius: 4px; }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-3);
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }
  .stat-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stat-num {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-primary);
  }
  .stat-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .tx-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .tx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .tx-header .section-card-title { margin: 0; }
  .see-all-btn {
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
  .see-all-btn:active { background: var(--primary-subtle); }
  .tx-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .show-more-btn {
    width: 100%;
    padding: var(--space-3);
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .show-more-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .empty-tx {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-8);
    color: var(--text-tertiary);
  }
  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .skeleton-row {
    height: 64px;
    border-radius: var(--radius-lg);
  }
</style>