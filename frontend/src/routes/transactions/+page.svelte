<script lang="ts">
  import api from '$lib/api'
  import WalletTabs from '$lib/components/composite/WalletTabs.svelte'
  import TransactionList from '$lib/components/composite/TransactionList.svelte'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import { onMount } from 'svelte'
  import { AlertCircle, RotateCw } from '@lucide/svelte'

  interface Transaction {
    id: string
    type: 'incoming' | 'outgoing'
    amount: number
    from?: string
    to?: string
    date: string
    status: string
    reference?: string
    category?: string
    metadata?: Record<string, unknown>
  }

  let transactions: Transaction[] = []
  let isLoading = true
  let hasError = false
  let errorMessage = ''
  let wallets: any[] = []
  let currentWallet: any = null

  let currentPage = 1
  const pageSize = 20
  let hasMorePages = false
  let loadingMore = false
  let totalCount = 0

  let showModal = false
  let selectedTx: Transaction | null = null

  async function loadTransactions() {
    isLoading = true; hasError = false; currentPage = 1
    try {
      const params: Record<string, unknown> = { page: 1, pageSize }
      if (currentWallet?.id) params.walletId = currentWallet.id
      const res = await api.listTransactions(params)
      if (res.success) {
        transactions = (Array.isArray(res.data) ? res.data : (res.data as any)?.transactions || []) as Transaction[]
        totalCount = (res as any).totalCount || 0
        hasMorePages = transactions.length >= pageSize
      } else throw new Error(res.message || 'Error')
    } catch (error: any) {
      hasError = true; errorMessage = error.message || 'Error desconocido'
    } finally { isLoading = false }
  }

  function selectWallet(w: any) {
    if (w.id === currentWallet?.id) return
    currentWallet = w
    loadTransactions()
  }

  async function loadMore() {
    if (loadingMore || !hasMorePages) return
    loadingMore = true; currentPage++
    try {
      const params: Record<string, unknown> = { page: currentPage, pageSize }
      if (currentWallet?.id) params.walletId = currentWallet.id
      const res = await api.listTransactions(params)
      if (res.success) {
        const more = (Array.isArray(res.data) ? res.data : (res.data as any)?.transactions || []) as Transaction[]
        transactions = [...transactions, ...more]
        hasMorePages = more.length >= pageSize
      }
    } catch { currentPage-- }
    finally { loadingMore = false }
  }

  function openDetail(tx: Transaction) { selectedTx = tx; showModal = true }
  function closeDetail() { showModal = false; selectedTx = null }

  function symbol(cur?: string) { return cur === 'BOB' ? 'Bs' : '$' }
  function fmt(n: number) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2 }) }
  function fmtDate(s: string) {
    const d = new Date(s)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  onMount(async () => {
    try {
      const walletsRes = await api.getWallets()
      if (walletsRes.success && walletsRes.data?.length > 0) {
        wallets = walletsRes.data
        currentWallet = wallets[0]
        await loadTransactions()
      } else throw new Error('No se encontraron billeteras')
    } catch (error: any) {
      hasError = true; errorMessage = error.message || 'Error'; isLoading = false
    }
  })
</script>

<PageLayout title="Transacciones">
  <WalletTabs {wallets} selected={currentWallet} onSelect={selectWallet} />

  <div class="content-area">
    {#if isLoading}
      <TransactionList loading={true} max={5} />
    {:else if hasError}
      <div class="state-box">
        <div class="state-icon error"><AlertCircle size={24} /></div>
        <p class="state-title">Error al cargar</p>
        <p class="state-desc">{errorMessage}</p>
        <button class="retry-btn" onclick={loadTransactions}>
          <RotateCw size={14} /> Intentar de nuevo
        </button>
      </div>
    {:else}
      <TransactionList
        {transactions}
        hasMore={hasMorePages}
        {loadingMore}
        onLoadMore={loadMore}
        onSelect={openDetail}
        emptyTitle="Sin movimientos"
        emptyMessage="Aún no hay actividad en esta cuenta"
      />
    {/if}
  </div>
</PageLayout>

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
  .content-area { flex: 1; display: flex; flex-direction: column; }
  .state-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-10) var(--space-6); text-align: center; }
  .state-icon { width: 56px; height: 56px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; }
  .state-icon.error { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .state-title { font-size: var(--text-lg); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .state-desc { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .retry-btn { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--primary); color: white; border: none; border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .retry-btn:active { opacity: 0.8; }
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
