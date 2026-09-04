export const ssr = false
export const prerender = false

<script lang="ts">
  import { onMount } from 'svelte'
  import api from '$lib/api'

  let year = $state(new Date().getFullYear())
  let month = $state(new Date().getMonth() + 1)
  let search = $state('')
  let loading = $state(true)
  let error = $state('')
  let success = $state('')
  let data = $state<any>(null)

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  function fmt(n: number) {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
  }
  function pct(n: number) {
    return (n * 100).toFixed(2) + '%'
  }

  async function load() {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      params.set('month', String(month))
      if (search) params.set('search', search.trim())
      const res: any = await api.listRecaudaciones(params.toString())
      if (res.success) data = res.data
    } catch (e: any) { error = e.message || String(e) }
    finally { loading = false }
  }

  onMount(load)

  let detailTenantId = $state<string | null>(null)
  let detailData = $state<any>(null)
  let detailLoading = $state(false)

  async function openDetail(tenantId: string) {
    if (detailTenantId === tenantId) { detailTenantId = null; detailData = null; return }
    detailTenantId = tenantId
    detailLoading = true
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) })
      const res: any = await api.getRecaudacionesDetail(tenantId, params.toString())
      if (res.success) detailData = res.data
    } catch (e: any) { error = e.message }
    finally { detailLoading = false }
  }

  function openNota(tenantId: string) {
    const url = `/recaudaciones/nota?id=${tenantId}&year=${year}&month=${month}`
    window.open(url, '_blank')
  }

  async function toggleDiscount(r: any) {
    const enabled = !r.hasDiscount
    try {
      error=''; success=''
      const res:any = await api.toggleRecaudacionDiscount(String(r.tenantId), { enabled, threshold: 200000, discountRate: 0.0005, baseRate: 0.001 })
      if (res.success) { success = res.message || (enabled ? 'Descuento 0.05% activado' : 'Descuento desactivado'); await load(); if(detailTenantId) await openDetail(detailTenantId!) }
    } catch(e:any){ error=e.message }
  }

  let years = $derived(Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i))
</script>

<div class="page-header">
  <div>
    <h1>Recaudaciones</h1>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Panel mensual por empresa — 0.10% base, 0.05% si supera Bs 200.000 (para empresas con descuento activo)</p>
  </div>
</div>

<div class="card" style="margin-bottom:16px">
  <div class="filters" style="align-items:flex-end;margin-bottom:0">
    <div class="form-group" style="margin-bottom:0;min-width:110px">
      <label>Año</label>
      <select bind:value={year} onchange={load}>
        {#each years as y}<option value={y}>{y}</option>{/each}
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0;min-width:150px">
      <label>Mes</label>
      <select bind:value={month} onchange={load}>
        {#each monthNames as m, i}<option value={i+1}>{i+1} — {m}</option>{/each}
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
      <label>Buscar empresa</label>
      <input placeholder="Nombre, email o NIT..." bind:value={search} oninput={() => { if (search.length===0 || search.length>2) load() }} />
    </div>
    <button class="btn primary" onclick={load} style="height:36px;margin-bottom:1px">Buscar</button>
  </div>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}
{#if success}<div class="success-msg">{success}</div>{/if}

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando recaudaciones...</p>
{:else if !data || data.items.length === 0}
  <div class="card empty-state">
    <p style="font-size:16px;margin-bottom:8px">Sin recaudaciones</p>
    <p style="font-size:13px;color:var(--text-secondary)">No hay movimientos de recaudación para <strong>{monthNames[month-1]} {year}</strong>.</p>
  </div>
{:else}
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Empresas que recaudaron</div>
      <div class="stat-value">{data.summary.empresas}</div>
      <div class="stat-sub">{data.summary.totalTx} transacciones en total</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total recaudado</div>
      <div class="stat-value">Bs {fmt(data.summary.totalGross)}</div>
      <div class="stat-sub">Bruto del mes</div>
    </div>
    <div class="stat-card" style="border-color:rgba(var(--primary-rgb),0.3)">
      <div class="stat-label" style="color:var(--primary)">Comisión total (0.10% / 0.05%)</div>
      <div class="stat-value" style="color:var(--primary)">Bs {fmt(data.summary.totalCommission)}</div>
      <div class="stat-sub">Descuento aplicado automáticamente si &gt;Bs 200k</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Neto a liquidar</div>
      <div class="stat-value">Bs {fmt(data.summary.netAmount)}</div>
      <div class="stat-sub">Total − comisión</div>
    </div>
  </div>

  <div class="card" style="overflow-x:auto;padding:0">
    <table class="table">
      <thead>
        <tr>
          <th>Empresa</th>
          <th>NIT / Doc.</th>
          <th style="text-align:center">Tx</th>
          <th style="text-align:right">Recaudado</th>
          <th style="text-align:center">Comisión</th>
          <th style="text-align:right">Importe comisión</th>
          <th style="text-align:right">Neto</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each data.items as r}
          <tr>
            <td>
              <div style="font-weight:600">{r.tenantName}</div>
              <div style="font-size:11px;color:var(--text-secondary)">{r.tenantEmail || '—'} {r.tenantPhone ? '· '+r.tenantPhone : ''}</div>
              {#if r.isDirect}
                <span class="badge" style="background:rgba(16,185,129,0.12);color:#059669;margin-top:4px">Directo · solo comisión</span>
              {:else if r.hasDiscount}
                <span class="badge" style="background:rgba(245,158,11,0.15);color:var(--warning);margin-top:4px">{r.qualifiesForDiscount ? '✓ 0.05% aplicado' : '0.05% si >200k'}</span>
              {:else}
                <span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);margin-top:4px">0.10% fijo</span>
              {/if}
              {#if r.isDirect}
                <span class="badge" style="background:rgba(16,185,129,0.08);color:#059669;border:1px solid rgba(16,185,129,0.2);margin-top:4px;margin-left:4px">Gateway: no</span>
              {:else}
                <span class="badge" style="background:rgba(99,102,241,0.08);color:var(--primary);border:1px solid rgba(99,102,241,0.15);margin-top:4px;margin-left:4px">Gateway</span>
              {/if}
            </td>
            <td style="font-size:12px">{r.documentNumber || '—'}<div style="font-size:11px;color:var(--text-tertiary)">{r.documentType || ''}</div></td>
            <td style="text-align:center"><span class="badge" style="background:rgba(var(--primary-rgb),0.12);color:var(--primary)">{r.txCount}</span></td>
            <td style="text-align:right;font-weight:600">Bs {fmt(r.totalGross)}</td>
            <td style="text-align:center;font-size:12px">
              <span style="font-weight:700;color:{r.qualifiesForDiscount ? 'var(--success)' : 'var(--primary)'}">{pct(r.effectiveRate)}</span>
              <div style="font-size:10px;color:var(--text-tertiary)">{r.qualifiesForDiscount ? '0.05% aplicado' : '0.10%'} - {r.wallets?.length || 1} billetera(s)</div>
            </td>
            <td style="text-align:right;color:var(--primary);font-weight:600">Bs {fmt(r.totalCommission)}</td>
            <td style="text-align:right">Bs {fmt(r.netAmount)}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              <button class="btn secondary small" onclick={() => openDetail(String(r.tenantId))}>{detailTenantId===String(r.tenantId) ? 'Ocultar' : 'Detalle'}</button>
              <button class="btn primary small" onclick={() => openNota(String(r.tenantId))}>Nota débito</button>
              <button class="btn small" style="background:{r.hasDiscount ? 'rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.1);color:var(--success);border:1px solid rgba(34,197,94,0.2)'}" onclick={() => toggleDiscount(r)}>
                {r.hasDiscount ? 'Quitar 0.05%' : 'Activar 0.05%'}
              </button>
            </td>
          </tr>
          {#if detailTenantId===String(r.tenantId)}
            <tr>
              <td colspan="8" style="background:rgba(var(--surface-rgb),0.6);padding:16px">
                {#if detailLoading}
                  <p style="color:var(--text-tertiary)">Cargando detalle...</p>
                {:else if detailData}
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                    <strong style="font-size:13px">Movimientos — {r.tenantName} · {monthNames[month-1]} {year}</strong>
                    <span style="font-size:12px;color:var(--text-secondary)">Total: Bs {fmt(detailData.summary.totalGross)} · Comisión {pct(detailData.summary.effectiveRate)} Bs {fmt(detailData.summary.totalCommission)} · Neto Bs {fmt(detailData.summary.netAmount)} · {detailData.pagination.total} registros {detailData.summary.qualifiesForDiscount ? '· ✓ 0.05% aplicado' : ''}</span>
                  </div>
                  <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:6px">
                    <table class="table" style="margin:0">
                      <thead>
                        <tr><th>Fecha</th><th>Billetera</th><th>Tipo</th><th style="text-align:right">Monto</th><th style="text-align:right">Comisión</th><th>Origen</th></tr>
                      </thead>
                      <tbody>
                        {#each detailData.items as m}
                          <tr>
                            <td style="font-size:12px;white-space:nowrap">{new Date(m.createdAt).toLocaleString('es-BO')}</td>
                            <td style="font-size:11px">{m.walletNumber}</td>
                            <td><span class="badge" style="background:rgba(34,197,94,0.12);color:var(--success);font-size:10px">{m.movementType}</span></td>
                            <td style="text-align:right">Bs {fmt(m.amount)}</td>
                            <td style="text-align:right;font-size:12px;color:var(--primary)">Bs {fmt(m.commission)} <span style="color:var(--text-tertiary)">({pct(m.commissionRate)})</span></td>
                            <td style="font-size:11px;color:var(--text-secondary)">{m.senderName || m.description || '—'}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                  <div style="margin-top:8px;display:flex;gap:6px">
                    <button class="btn primary small" onclick={() => openNota(String(r.tenantId))}>Generar nota de débito PDF</button>
                    <button class="btn secondary small" onclick={() => detailTenantId=null}>Cerrar detalle</button>
                  </div>
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
      <tfoot>
        <tr style="background:var(--surface-hover);font-weight:700">
          <td colspan="3" style="text-align:right">TOTAL MES</td>
          <td style="text-align:right">Bs {fmt(data.summary.totalGross)}</td>
          <td></td>
          <td style="text-align:right;color:var(--primary)">Bs {fmt(data.summary.totalCommission)}</td>
          <td style="text-align:right">Bs {fmt(data.summary.netAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <p style="margin-top:12px;color:var(--text-tertiary);font-size:12px">
    Periodo: {data.period.start?.slice(0,10)} → {data.period.end?.slice(0,10)} · <b>0.10% = 0.001</b> base, <b>0.05% = 0.0005</b> si la empresa tiene descuento activo y supera <b>Bs 200.000</b> en el mes. Toggle <b>Activar 0.05%</b> por empresa. Nota de débito incluye IVA 13% informativo.
  </p>
{/if}

<style>
  tfoot td { padding:12px; border-top:2px solid var(--border); }
</style>
