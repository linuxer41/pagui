<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth'
  import { balanceStore } from '$lib/stores/balance'
  import api from '$lib/api'
  import PullToRefresh from '$lib/components/PullToRefresh.svelte'
  import BalanceCard from '$lib/components/composite/BalanceCard.svelte'
  import QuickActions from '$lib/components/composite/QuickActions.svelte'
  import TransactionList from '$lib/components/composite/TransactionList.svelte'
  import { onSSEEvent, type WalletBalanceUpdateEvent } from '$lib/services/sseService'
  import { Bell, Headset } from '@lucide/svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'

  let balance = $state(0)
  let availableBalance = $state(0)
  let balancePulse = $state(false)
  let wallets: any[] = $state([])
  let transactions: any[] = $state([])
  let loading = $state(true)

  let userName = $derived($auth?.user?.fullName || $auth?.user?.email?.split('@')[0] || 'Usuario')
  let userInitial = $derived(userName.charAt(0).toUpperCase())
  let greeting = $derived((() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  })())

  let unreadCount = $state(0)
  let unsubBalance: (() => void) | null = null

  let showModal = $state(false)
  let selectedTx: any = $state(null)

  onMount(async () => {
    balanceStore.subscribe(v => {
      if (v.balance !== balance && balance > 0) {
        balancePulse = true
        setTimeout(() => balancePulse = false, 1000)
      }
      if (v.balance > 0 || v.updatedAt) {
        balance = v.balance
        availableBalance = v.availableBalance
      }
    })

    unsubBalance = onSSEEvent('wallet_balance_update', (data: WalletBalanceUpdateEvent) => {
      balanceStore.setBalances(data.newBalance, data.newAvailableBalance, data.currency)
    })

    try {
      const [balRes, txRes] = await Promise.allSettled([
        api.getWallets(),
        api.getRecentTransactions(10),
      ])
      if (balRes.status === 'fulfilled' && balRes.value.success) {
        wallets = balRes.value.data || []
        if (wallets.length > 0) {
          balance = Number(wallets[0].balance) || 0
          availableBalance = Number(wallets[0].availableBalance) || 0
        }
      }
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        transactions = Array.isArray(txRes.value.data) ? txRes.value.data : []
      }
    } catch {}
    try {
      const notifRes = await api.getUnreadNotificationCount()
      if (notifRes.success) unreadCount = notifRes.data.count
    } catch {}
    finally { loading = false }
  })

  onDestroy(() => {
    unsubBalance?.()
    balanceStore.cleanup()
  })

  function closeDetail() { showModal = false; selectedTx = null }

  function symbol(cur?: string) { return cur === 'BOB' ? 'Bs' : '$' }
  function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2 }) }
  function fmtDate(s: string) {
    const d = new Date(s)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  async function handleRefresh() {
    loading = true
    try {
      const [balRes, txRes] = await Promise.allSettled([
        api.getWallets(),
        api.getRecentTransactions(10),
      ])
      if (balRes.status === 'fulfilled' && balRes.value.success) {
        wallets = balRes.value.data || []
        if (wallets.length > 0) {
          balance = Number(wallets[0].balance) || 0
          availableBalance = Number(wallets[0].available_balance) || 0
        }
      }
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        transactions = Array.isArray(txRes.value.data) ? txRes.value.data : []
      }
    } catch {}
    finally { loading = false }
  }
</script>

<PullToRefresh onrefresh={handleRefresh}>
<div class="home">
  <header class="home-header">
    <div class="header-left">
      <span class="header-greeting">{greeting}</span>
      <h1 class="header-name">{userName}</h1>
    </div>
    <div class="header-actions">
      <IconButton onclick={() => goto('/notifications')} label="Notificaciones">
        <Bell size={20} />
        {#if unreadCount > 0}
          <span class="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        {/if}
      </IconButton>
      <IconButton onclick={() => goto('/support')} label="Soporte">
        <Headset size={20} />
      </IconButton>
    </div>
  </header>

  <div class="home-content">
    <BalanceCard wallets={wallets} />

    <div class="home-section">
      <QuickActions
        onSend={() => goto('/transfers/p2p')}
        onScan={() => goto('/qr?mode=pay')}
        onNfc={() => goto('/nfc')}
        onRecaudar={() => goto('/collections')}
      />
    </div>

    <TransactionList
      {transactions}
      {loading}
      max={5}
      showSeeAll={true}
      onSeeAll={() => goto('/transactions')}
      onSelect={(tx) => { selectedTx = tx; showModal = true }}
      emptyTitle="Sin movimientos"
      emptyMessage="Aún no hay actividad en tu cuenta"
    />
  </div>
</div>
</PullToRefresh>

{#if showModal && selectedTx}
  <div class="modal-overlay" role="presentation" onclick={closeDetail} onkeydown={(e) => e.key === 'Escape' && closeDetail()}>
    <div class="modal-box" role="dialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">Detalles</span>
        <button class="modal-close" onclick={closeDetail}>&times;</button>
      </div>
      <div class="modal-detail">
        <div class="detail-hero" class:income={selectedTx.type === 'incoming'} class:expense={selectedTx.type === 'outgoing'}>
          {selectedTx.type === 'incoming' ? '+' : '-'}{symbol(selectedTx.metadata?.currency as string)}{fmt(selectedTx.amount)}
        </div>
        <div class="detail-section">
          <span class="detail-section-title">Información general</span>
          {#if selectedTx.from}<div class="detail-row"><span class="detail-label">De</span><span class="detail-value">{selectedTx.from}</span></div>{/if}
          {#if selectedTx.to}<div class="detail-row"><span class="detail-label">Para</span><span class="detail-value">{selectedTx.to}</span></div>{/if}
          <div class="detail-row"><span class="detail-label">Tipo</span><span class="detail-value">{selectedTx.category || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value">{selectedTx.status}</span></div>
        </div>
        <div class="detail-section">
          <span class="detail-section-title">Transacción</span>
          <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value code">{selectedTx.id}</span></div>
          {#if selectedTx.reference}<div class="detail-row"><span class="detail-label">Referencia</span><span class="detail-value code">{selectedTx.reference}</span></div>{/if}
          {#if selectedTx.metadata?.qrId}<div class="detail-row"><span class="detail-label">ID QR</span><span class="detail-value code">{selectedTx.metadata.qrId as string}</span></div>{/if}
          {#if selectedTx.metadata?.walletId}<div class="detail-row"><span class="detail-label">Wallet</span><span class="detail-value code">{selectedTx.metadata.walletId as string}</span></div>{/if}
        </div>
        <div class="detail-section">
          <span class="detail-section-title">Fechas</span>
          <div class="detail-row"><span class="detail-label">Fecha</span><span class="detail-value">{fmtDate(selectedTx.date)}</span></div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .home {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-4) var(--space-2);
  }
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  .header-greeting { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); font-weight: 500; }
  .header-name {
    font-size: var(--text-2xl); font-weight: 800; color: rgba(var(--text-primary-rgb), 1);
    letter-spacing: var(--tracking-tight); line-height: 1.2; margin: 0;
  }
  .header-actions { display: flex; align-items: center; gap: var(--space-2); }
  .notif-badge {
    position: absolute; top: 4px; right: 4px;
    min-width: 18px; height: 18px; border-radius: var(--radius-full);
    background: var(--color-error-foreground);
    color: white; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4px; line-height: 1;
  }
  .avatar-btn {
    width: 44px; height: 44px; border-radius: var(--radius-full);
    background: var(--primary); border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity var(--duration-fast);
    flex-shrink: 0;
  }
  .avatar-btn:active { opacity: 0.8; }
  .avatar-initials { color: white; font-weight: 700; font-size: var(--text-lg); }
  .home-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4) var(--space-4);
  }
  .home-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .modal-detail { display: flex; flex-direction: column; gap: var(--space-5); padding: var(--space-6); }
  .detail-hero { text-align: center; font-size: var(--text-2xl); font-weight: 800; padding: var(--space-4); border-radius: var(--radius-xl); }
  .detail-hero.income { background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); }
  .detail-hero.expense { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .detail-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .detail-section-title { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-tertiary-rgb), 1); text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); gap: var(--space-2); }
  .detail-label { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); flex-shrink: 0; }
  .detail-value { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); text-align: right; word-break: break-word; }
  .detail-value.code { font-family: var(--font-mono); color: var(--primary); }
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4); }
  .modal-box { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-6); border-bottom: 1px solid rgba(var(--border-rgb), 0.3); }
  .modal-title { font-size: var(--text-lg); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); }
  .modal-close { background: none; border: none; color: rgba(var(--text-tertiary-rgb), 1); font-size: 1.5rem; cursor: pointer; padding: var(--space-1); line-height: 1; border-radius: var(--radius-sm); }
  .modal-close:hover { color: rgba(var(--text-primary-rgb), 1); }
</style>
