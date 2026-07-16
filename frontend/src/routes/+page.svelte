<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth'
  import { balanceStore } from '$lib/stores/balance'
  import api from '$lib/api'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import Skeleton from '$lib/components/Skeleton.svelte'
  import PullToRefresh from '$lib/components/PullToRefresh.svelte'
  import BalanceCard from '$lib/components/composite/BalanceCard.svelte'
  import QuickActions from '$lib/components/composite/QuickActions.svelte'
  import TransactionRow from '$lib/components/composite/TransactionRow.svelte'
  import { onSSEEvent, type AccountBalanceUpdateEvent } from '$lib/services/sseService'
  import { ChevronRight } from '@lucide/svelte'
  import PiggyBank from '@lucide/svelte/icons/piggy-bank'

  let balance = $state(0)
  let availableBalance = $state(0)
  let accounts: any[] = $state([])
  let transactions: any[] = $state([])
  let loading = $state(true)
  let balanceVisible = $state(true)
  let balancePulse = $state(false)

  let userName = $derived($auth?.user?.fullName || $auth?.user?.email?.split('@')[0] || 'Usuario')
  let userInitial = $derived(userName.charAt(0).toUpperCase())
  let greeting = $derived((() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  })())

  let unsubBalance: (() => void) | null = null

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

    unsubBalance = onSSEEvent('account_balance_update', (data: AccountBalanceUpdateEvent) => {
      balanceStore.setBalances(data.newBalance, data.newAvailableBalance, data.currency)
    })

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
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        transactions = Array.isArray(txRes.value.data) ? txRes.value.data : (txRes.value.data as any)?.data || []
      }
    } catch {}
    finally { loading = false }
  })

  onDestroy(() => {
    unsubBalance?.()
    balanceStore.cleanup()
  })

  async function handleRefresh() {
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
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        transactions = Array.isArray(txRes.value.data) ? txRes.value.data : (txRes.value.data as any)?.data || []
      }
    } catch {}
  }
</script>

<PullToRefresh onrefresh={handleRefresh}>
<div class="home">
  <header class="home-header">
    <div class="header-left">
      <span class="header-greeting">{greeting}</span>
      <h1 class="header-name">{userName}</h1>
    </div>
    <button class="avatar-btn" onclick={() => goto('/profile')} aria-label="Perfil">
      <span class="avatar-initials">{userInitial}</span>
    </button>
  </header>

  <div class="home-content">
    <BalanceCard balance={balance} currency="BOB" cardType="Débito" />

    <div class="home-section">
      <QuickActions
        onSend={() => goto('/transfers/p2p')}
        onReceive={() => goto('/qr')}
        onScan={() => goto('/qr?mode=pay')}
        onCash={() => goto('/cash')}
      />
    </div>

    <div class="home-section">
      <div class="section-header">
        <span class="section-title">Últimos movimientos</span>
        <button class="see-all-btn" onclick={() => goto('/transactions')}>
          Ver todo <ChevronRight size={14} />
        </button>
      </div>
      {#if loading}
        <Skeleton width="100%" height="58px" radius="lg" count={3} gap="space-2" />
      {:else if transactions.length === 0}
        <EmptyState icon={PiggyBank} title="Sin movimientos" message="Aún no hay actividad en tu cuenta" />
      {:else}
        <div class="tx-list">
          {#each transactions.slice(0, 5) as tx (tx.id)}
            <TransactionRow tx={tx} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
</PullToRefresh>

<style>
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
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
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .section-title {
    font-size: var(--text-sm); font-weight: 600; color: var(--foreground);
  }
  .see-all-btn {
    display: flex; align-items: center; gap: 2px;
    background: none; border: none;
    font-size: var(--text-sm); font-weight: 600;
    color: var(--primary); cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
  }
  .see-all-btn:active { background: rgba(var(--surface-rgb), 1); }
  .tx-list { display: flex; flex-direction: column; gap: 1px; }
</style>
