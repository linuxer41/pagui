<script lang="ts">
  import { onMount } from 'svelte'
  import api from '$lib/api'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import { Clock, CheckCircle, XCircle, AlertCircle } from '@lucide/svelte'

  let settlements = $state<any[]>([])
  let pendingTotal = $state(0)
  let loading = $state(true)
  let error = $state('')

  onMount(load)

  async function load() {
    loading = true; error = ''
    try {
      const [sRes, pRes] = await Promise.all([
        api.listSettlements(),
        api.getPendingSettlements(),
      ])
      if (sRes.success) settlements = sRes.data.settlements
      else error = sRes.message || 'Error'
      if (pRes.success) pendingTotal = pRes.data.pendingTotal
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  function formatAmount(n: number, cur = 'BOB') {
    const f = n.toLocaleString('es-BO', { minimumFractionDigits: 2 })
    return cur === 'BOB' ? `Bs ${f}` : `$${f}`
  }

  function formatDate(s: string) {
    if (!s) return ''
    return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const statusIcon = (s: string) =>
    s === 'completed' ? CheckCircle : s === 'failed' ? XCircle : Clock
  const statusColor = (s: string) =>
    s === 'completed' ? 'var(--color-success-foreground)' : s === 'failed' ? 'var(--color-error-foreground)' : 'var(--muted-foreground)'
  const statusLabel = (s: string) =>
    s === 'completed' ? 'Liquidado' : s === 'failed' ? 'Fallido' : 'Pendiente'
</script>

<PageLayout title="Auto-Transferencia">
  {#if pendingTotal > 0}
    <div class="pending-card">
      <span class="pending-label">Saldo pendiente por liquidar</span>
      <span class="pending-amount">{formatAmount(pendingTotal)}</span>
    </div>
  {/if}

  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if loading}
    <div class="loading">Cargando...</div>
  {:else if settlements.length === 0}
    <div class="empty">
      <p>Sin movimientos aún.</p>
      <p class="hint">Cuando recibas cobros, el saldo se transferirá automáticamente a tu cuenta Baneco.</p>
    </div>
  {:else}
    <div class="list">
      {#each settlements as s}
        <div class="item">
          <div class="item-head">
            <div class="item-status">
              {#each { length: 1 } as _}
                {#if statusIcon(s.status)}
                  {@const Icon = statusIcon(s.status)}
                  <Icon size={16} style="color: {statusColor(s.status)}" />
                {/if}
              {/each}
              <span class="item-status-label" style="color: {statusColor(s.status)}">
                {statusLabel(s.status)}
              </span>
            </div>
            <span class="item-date">{formatDate(s.created_at)}</span>
          </div>
          <div class="item-rows">
            <div class="item-row">
              <span>Bruto</span>
              <span>{formatAmount(s.gross_amount)}</span>
            </div>
            <div class="item-row">
              <span>Comisión ({s.commission_rate}%)</span>
              <span class="mono">-{formatAmount(s.commission)}</span>
            </div>
            <div class="item-row total">
              <span>Neto recibido</span>
              <span>{formatAmount(s.net_amount)}</span>
            </div>
          </div>
          {#if s.reference}
            <div class="item-ref">Ref: {s.reference}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .pending-card { background: var(--primary); color: var(--primary-foreground); border-radius: var(--radius-xl); padding: var(--space-5); text-align: center; }
  .pending-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
  .pending-amount { display: block; font-size: 2rem; font-weight: 800; margin-top: var(--space-1); }
  .error-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .loading { text-align: center; padding: var(--space-8); color: var(--muted-foreground); }
  .empty { text-align: center; padding: var(--space-8); color: var(--muted-foreground); font-size: var(--text-sm); }
  .hint { font-size: var(--text-xs); opacity: 0.7; margin-top: var(--space-1); }
  .list { display: flex; flex-direction: column; gap: var(--space-3); }
  .item { padding: var(--space-4); background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); }
  .item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
  .item-status { display: flex; align-items: center; gap: var(--space-1); }
  .item-status-label { font-size: var(--text-sm); font-weight: 600; }
  .item-date { font-size: var(--text-xs); color: var(--muted-foreground); }
  .item-rows { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }
  .item-row { display: flex; justify-content: space-between; }
  .item-row.total { border-top: 1px solid var(--border); padding-top: var(--space-2); margin-top: var(--space-1); font-weight: 700; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .item-ref { margin-top: var(--space-2); font-size: var(--text-xs); color: var(--muted-foreground); font-family: 'JetBrains Mono', monospace; }
</style>
