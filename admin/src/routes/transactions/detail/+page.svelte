<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let tx = $state<any>(null)
  let loading = $state(true)
  let error = $state('')

  const id = $derived($page.url.searchParams.get('id') || '')

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n) }

  onMount(async () => {
    if (!id) { loading = false; error = 'ID no proporcionado'; return }
    loading = true; error = ''
    try {
      const res = await api.getTransaction(id)
      if (res.success) tx = res.data
    } catch (e: any) { error = e.message }
    finally { loading = false }
  })
</script>

<div class="page-header">
  <h1>Transacción #{id}</h1>
  <button class="btn secondary" onclick={() => goto('/transactions')}>Volver</button>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if tx}
  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Estado</div>
      <div><span class="badge {tx.status}" style="font-size:14px">{tx.status}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Monto</div>
      <div class="stat-value" style="font-size:22px">Bs {fmt(tx.amount)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Comisión</div>
      <div class="stat-value" style="font-size:16px;color:var(--text-tertiary)">Bs {fmt(tx.fee || 0)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total</div>
      <div class="stat-value" style="font-size:16px">Bs {fmt(tx.total)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Moneda</div>
      <div class="stat-value" style="font-size:16px">{tx.currency}</div>
    </div>
  </div>

  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Wallet origen</div>
      {#if tx.senderWalletId}
        <div class="stat-value" style="font-size:16px">
          <a href="/wallets/detail?id={tx.senderWalletId}" style="color:var(--primary);text-decoration:none">
            {tx.senderWalletName || tx.senderWalletNumber}
          </a>
        </div>
      {:else}
        <div class="stat-value" style="font-size:16px;color:var(--text-secondary)">—</div>
      {/if}
    </div>
    <div class="stat-card">
      <div class="stat-label">Wallet destino</div>
      {#if tx.receiverWalletId}
        <div class="stat-value" style="font-size:16px">
          <a href="/wallets/detail?id={tx.receiverWalletId}" style="color:var(--primary);text-decoration:none">
            {tx.receiverWalletName || tx.receiverWalletNumber}
          </a>
        </div>
      {:else}
        <div class="stat-value" style="font-size:16px;color:var(--text-secondary)">—</div>
      {/if}
    </div>
    <div class="stat-card">
      <div class="stat-label">Descripción</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">{tx.description || '—'}</div>
    </div>
  </div>

  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Creado</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">
        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Completado</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">
        {tx.completedAt ? new Date(tx.completedAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Referencia</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">{tx.referenceType ? `${tx.referenceType}: ${tx.referenceId}` : '—'}</div>
    </div>
    {#if tx.errorMessage}
      <div class="stat-card" style="border-color:var(--danger)">
        <div class="stat-label">Error</div>
        <div class="stat-value" style="font-size:14px;color:var(--danger)">{tx.errorMessage}</div>
      </div>
    {/if}
  </div>
{/if}
