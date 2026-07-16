<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  import Section from '$lib/components/Section.svelte'
  import Skeleton from '$lib/components/Skeleton.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import TransactionRow from '$lib/components/composite/TransactionRow.svelte'
  import { onMount } from 'svelte'
  import { AlertCircle, RotateCw, History } from '@lucide/svelte'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'

  let movements: any[] = []
  let isLoading = true
  let hasError = false
  let errorMessage = ''
  let currentAccount: any = null
  let currency = 'BOB'

  let currentPage = 1
  const pageSize = 20
  let hasMorePages = false
  let loadingMore = false

  let showMovementModal = false
  let selectedMovement: any = null

  async function loadAccountMovements() {
    if (!currentAccount) return
    isLoading = true; hasError = false
    try {
      const response = await api.getAccountMovements(currentAccount.id, currentPage, pageSize)
      if (response.success && response.data) {
        movements = response.data || []
        hasMorePages = (response.data || []).length === pageSize
      } else throw new Error(response.message || 'Error')
    } catch (error: any) {
      hasError = true
      errorMessage = error.message || 'Error desconocido'
    } finally { isLoading = false }
  }

  async function loadMoreMovements() {
    if (loadingMore || !hasMorePages || !currentAccount) return
    loadingMore = true
    currentPage++
    try {
      const response = await api.getAccountMovements(currentAccount.id, currentPage, pageSize)
      if (response.success && response.data) {
        movements = [...movements, ...(response.data || [])]
        hasMorePages = (response.data || []).length === pageSize
      }
    } catch { currentPage-- }
    finally { loadingMore = false }
  }

  function openMovementModal(movement: any) {
    selectedMovement = movement
    showMovementModal = true
  }
  function closeMovementModal() { showMovementModal = false; selectedMovement = null }

  function formatDate(dateString: string): string {
    const date = new Date(dateString); const now = new Date()
    if (date.toDateString() === now.toDateString())
      return `Hoy, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    const yesterday = new Date(Date.now() - 86400000)
    if (date.toDateString() === yesterday.toDateString())
      return `Ayer, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function getCurrencySymbol(cur: string): string {
    if (cur === 'BOB') return 'Bs'; if (cur === 'USD') return '$'; return cur
  }

  function mapMovementToTx(m: any) {
    return {
      id: m.id,
      type: m.movementType === 'qr_payment' ? 'receive' : 'send',
      amount: m.amount,
      counterparty: m.senderName || m.description || 'Movimiento',
      date: formatDate(m.createdAt),
      status: m.status || 'completado',
      currency: m.currency || currency,
    } as any
  }

  onMount(async () => {
    try {
      const accountsResponse = await api.getAccounts()
      if (accountsResponse.success && accountsResponse.data?.length > 0) {
        currentAccount = accountsResponse.data[0]
        currency = currentAccount.currency
        await loadAccountMovements()
      } else throw new Error('No se encontraron cuentas')
    } catch (error: any) {
      hasError = true
      errorMessage = error.message || 'Error'
      isLoading = false
    }
  })
</script>

<PageLayout title="Transacciones">

  {#if isLoading}
    <Section>
      <Skeleton width="100%" height="58px" radius="lg" count={5} gap="space-1" />
    </Section>
  {:else if hasError}
    <div class="state-box">
      <div class="state-icon error"><AlertCircle size={24} /></div>
      <p class="state-title">Error al cargar</p>
      <p class="state-desc">{errorMessage}</p>
      <button class="retry-btn" onclick={loadAccountMovements}>
        <RotateCw size={14} /> Intentar de nuevo
      </button>
    </div>
  {:else if movements.length === 0}
    <EmptyState icon={History} title="Sin movimientos" message="Aún no hay actividad en tu cuenta" action="Ir al inicio" onaction={() => goto('/')} />
  {:else}
    <Section>
      <div class="tx-list">
        {#each movements as movement (movement.id)}
          <div role="button" tabindex="0" onclick={() => openMovementModal(movement)} onkeydown={(e) => e.key === 'Enter' && openMovementModal(movement)}>
            <TransactionRow tx={mapMovementToTx(movement)} />
          </div>
        {/each}
      </div>

      {#if hasMorePages}
        <button class="load-more" onclick={loadMoreMovements} disabled={loadingMore}>
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </button>
      {/if}
    </Section>
  {/if}
</PageLayout>

{#if showMovementModal && selectedMovement}
  <div class="modal-overlay" role="presentation" onclick={closeMovementModal} onkeydown={(e) => e.key === 'Escape' && closeMovementModal()}>
    <div class="modal-box" role="dialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="modal-header"><span class="modal-title">Detalles</span><button class="modal-close" onclick={closeMovementModal}>&times;</button></div>
      <div class="modal-detail">
        <div class="detail-hero" class:income={selectedMovement.movementType === 'qr_payment'} class:expense={selectedMovement.movementType !== 'qr_payment'}>
          {selectedMovement.movementType === 'qr_payment' ? '+' : '-'} {getCurrencySymbol(selectedMovement.currency || currency)} {formatCurrency(selectedMovement.amount)}
        </div>
        <div class="detail-section">
          <span class="detail-section-title">Información general</span>
          <div class="detail-row"><span class="detail-label">Remitente</span><span class="detail-value">{selectedMovement.senderName || 'No disponible'}</span></div>
          <div class="detail-row"><span class="detail-label">Descripción</span><span class="detail-value">{selectedMovement.description}</span></div>
        </div>
        <div class="detail-section">
          <span class="detail-section-title">Transacción</span>
          <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value code">{selectedMovement.transactionId || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Referencia</span><span class="detail-value code">{selectedMovement.reference || '—'}</span></div>
          {#if selectedMovement.qrId}<div class="detail-row"><span class="detail-label">ID QR</span><span class="detail-value code">{selectedMovement.qrId}</span></div>{/if}
        </div>
        {#if selectedMovement.senderAccount || selectedMovement.senderBankCode}
          <div class="detail-section">
            <span class="detail-section-title">Remitente</span>
            {#if selectedMovement.senderAccount}<div class="detail-row"><span class="detail-label">Cuenta</span><span class="detail-value code">{selectedMovement.senderAccount}</span></div>{/if}
            {#if selectedMovement.senderBankCode}<div class="detail-row"><span class="detail-label">Banco</span><span class="detail-value code">{selectedMovement.senderBankCode.trim()}</span></div>{/if}
            {#if selectedMovement.senderDocumentId}<div class="detail-row"><span class="detail-label">Documento</span><span class="detail-value code">{selectedMovement.senderDocumentId}</span></div>{/if}
          </div>
        {/if}
        <div class="detail-section">
          <span class="detail-section-title">Fechas</span>
          <div class="detail-row"><span class="detail-label">Creación</span><span class="detail-value">{formatDate(selectedMovement.createdAt)}</span></div>
          {#if selectedMovement.paymentDate}<div class="detail-row"><span class="detail-label">Pago</span><span class="detail-value">{new Date(selectedMovement.paymentDate).toLocaleDateString('es-ES')}</span></div>{/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tx-list { display: flex; flex-direction: column; }
  .load-more { display: flex; align-items: center; justify-content: center; gap: var(--space-2); width: 100%; padding: var(--space-4); border: none; border-top: 1px solid rgba(var(--border-rgb), 0.3); background: transparent; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .load-more:active { background: rgba(var(--surface-rgb), 1); }
  .state-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-10) var(--space-6); text-align: center; }
  .state-icon { width: 56px; height: 56px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; }
  .state-icon.error { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .state-title { font-size: var(--text-lg); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .state-desc { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .retry-btn { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--primary); color: white; border: none; border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .retry-btn:active { opacity: 0.8; }
  .modal-detail { display: flex; flex-direction: column; gap: var(--space-5); }
  .detail-hero { text-align: center; font-size: var(--text-2xl); font-weight: 800; padding: var(--space-4); border-radius: var(--radius-xl); }
  .detail-hero.income { background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); }
  .detail-hero.expense { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .detail-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .detail-section-title { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-tertiary-rgb), 1); text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); gap: var(--space-2); }
  .detail-label { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); flex-shrink: 0; }
  .detail-value { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); text-align: right; word-break: break-word; }
  .detail-value.code { font-family: var(--font-mono); color: var(--primary); }
</style>
