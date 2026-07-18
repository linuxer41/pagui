<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let transactions = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let statusFilter = $state('')
  let dateFrom = $state('')
  let dateTo = $state('')
  let page = $state(1)
  let totalPages = $state(1)

  async function load(pg = page) {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      params.set('page', String(pg))
      if (statusFilter) params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await api.listTransactions(params.toString())
      if (res.success) {
        transactions = res.data?.items || []
        const pag = res.data?.pagination
        if (pag) { page = pag.page; totalPages = pag.totalPages }
      }
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  function goPage(pg: number) { if (pg >= 1 && pg <= totalPages) { page = pg; load(pg) } }

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n) }

  onMount(() => load())
</script>

<div class="page-header"><h1>Transacciones</h1></div>

{#if error}<div class="error-msg">{error}</div>{/if}

<div class="filters">
  <input type="date" bind:value={dateFrom} onchange={() => goPage(1)} style="width:auto" />
  <input type="date" bind:value={dateTo} onchange={() => goPage(1)} style="width:auto" />
  <select bind:value={statusFilter} onchange={() => goPage(1)}>
    <option value="">Todos</option>
    <option value="completed">Completadas</option>
    <option value="pending">Pendientes</option>
    <option value="failed">Fallidas</option>
  </select>
</div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if transactions.length === 0}
  <div class="empty-state">No hay transacciones</div>
{:else}
  <div class="card" style="overflow-x:auto">
    <table class="table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Origen</th>
          <th>Destino</th>
          <th>Monto</th>
          <th>Comisión</th>
          <th>Descripción</th>
          <th>Estado</th>
          <th>Error</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        {#each transactions as t}
          <tr>
            <td style="white-space:nowrap;font-size:12px">{new Date(t.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td style="font-size:12px">{t.senderWalletName || t.senderWalletNumber || '—'}</td>
            <td style="font-size:12px">{t.receiverWalletName || t.receiverWalletNumber || '—'}</td>
            <td style="font-weight:600">Bs {fmt(t.amount)}</td>
            <td style="color:var(--text-tertiary)">Bs {fmt(t.fee || 0)}</td>
            <td style="font-size:12px;color:var(--text-secondary)">{t.description || '—'}</td>
            <td><span class="badge {t.status}">{t.status}</span></td>
            <td style="font-size:11px;color:var(--danger);max-width:200px;overflow:hidden;text-overflow:ellipsis">{t.errorMessage || '—'}</td>
            <td><button class="btn primary small" onclick={() => goto(`/transactions/detail?id=${t.id}`)}>Ver</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="pagination">
      <button class="btn secondary small" disabled={page <= 1} onclick={() => goPage(page - 1)}>Anterior</button>
      <span style="font-size:13px;color:var(--text-tertiary)">Pág {page} de {totalPages}</span>
      <button class="btn secondary small" disabled={page >= totalPages} onclick={() => goPage(page + 1)}>Siguiente</button>
    </div>
  </div>
{/if}

<style>
  .pagination { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 0 }
</style>
