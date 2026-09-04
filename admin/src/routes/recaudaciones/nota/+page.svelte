<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import api from '$lib/api'

  let loading = $state(true)
  let error = $state('')
  let note = $state<any>(null)
  let pdfUrl = $state<string | null>(null)
  let pdfLoading = $state(false)
  let pdfError = $state('')
  let view = $state<'pdf' | 'html'>('pdf')

  let tenantId = $state('')
  let year = $state('')
  let month = $state('')

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n||0) }

  onMount(async () => {
    const p: any = $page.url.searchParams
    tenantId = p.get('id') || p.get('tenantId') || ''
    year = p.get('year') || String(new Date().getFullYear())
    month = p.get('month') || String(new Date().getMonth()+1)
    if (!tenantId) { error='Falta id de empresa'; loading=false; return }
    try {
      const res: any = await api.getDebitNote(tenantId, new URLSearchParams({ year, month }).toString())
      if (res.success) note = res.data
      else error = res.message || 'No se pudo generar'
      // PDF binario pdfkit (backend, no HTML)
      pdfLoading = true
      try {
        const blob = await api.getDebitNotePdf(tenantId, new URLSearchParams({ year, month }).toString())
        pdfUrl = URL.createObjectURL(blob)
        view = 'pdf'
      } catch (e:any) { pdfError = e.message || String(e); view = 'html' }
      finally { pdfLoading = false }
    } catch(e:any){ error = e.message || String(e) }
    finally { loading=false }
  })

  function printHtml() { window.print() }
  function downloadPdf() {
    if (!pdfUrl || !note) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${note.correlative}.pdf`
    a.click()
  }
</script>

<svelte:head>
  <title>Nota de Débito — {note?.correlative || ''}</title>
</svelte:head>

{#if loading}
  <div class="loading">Generando nota…</div>
{:else if error}
  <div class="error-card">
    <h2>No se pudo generar</h2>
    <p>{error}</p>
    <button class="btn-ghost" onclick={() => window.close()}>Cerrar</button>
  </div>
{:else if note}
  <div class="toolbar no-print">
    <div class="toolbar-inner">
      <div class="toolbar-left">
        <span class="hint">{note.correlative} · {note.period.periodLabel}</span>
        <span class="tabs">
          <button class:active={view==='pdf'} onclick={() => view='pdf'}>PDF</button>
          <button class:active={view==='html'} onclick={() => view='html'}>Vista HTML</button>
        </span>
      </div>
      <div class="toolbar-right"></div>
    </div>
  </div>

  {#if view==='pdf'}
    {#if pdfLoading}
      <div class="pdf-loading">Generando PDF con pdfkit (backend)…</div>
    {:else if pdfUrl}
      <div class="pdf-wrap">
        <div class="pdf-head">
          <span>Visor PDF — render nativo pdfkit</span>
          <span class="dim">{note.correlative}.pdf · {fmt(note.summary.totalCommission)} BOB</span>
        </div>
        <iframe src={pdfUrl} title="Nota de débito PDF" class="pdf-frame"></iframe>
      </div>
      <p class="pdf-hint no-print">Si no ves el PDF, usa <button class="link" onclick={() => view='html'}>vista HTML</button> o <button class="link" onclick={downloadPdf}>descargar</button>.</p>
    {:else}
      <div class="pdf-error">
        <p>No se pudo cargar el PDF: {pdfError || 'backend no disponible'}</p>
        <p class="dim">Se muestra vista HTML. Verifica que el backend esté en {`http://localhost:3000`} y tu sesión admin sea válida.</p>
        <button class="btn-primary" onclick={() => view='html'}>Ver HTML</button>
      </div>
    {/if}
  {/if}

  {#if view==='html' || !pdfUrl}
  <div class="sheet">
    <div class="top-accent"></div>
    <header class="header">
      <div class="brand">
        <div class="mark">PAGUI</div>
        <div class="brand-sub">IATHINGS <span>·</span> Plataforma de recaudación <span>·</span> {note.issuer.address}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-kicker">Nota de débito</div>
        <div class="doc-number">{note.correlative}</div>
        <div class="doc-date">{new Date(note.issueDate).toLocaleDateString('es-BO', { day:'2-digit', month:'long', year:'numeric'})} · {note.period.periodLabel}</div>
      </div>
    </header>

    <section class="card">
      <div class="card-head">
        <span>Cliente</span>
      </div>
      <div class="grid">
        <div class="field"><label>Empresa</label><strong>{note.client.name}</strong></div>
        <div class="field"><label>NIT / Documento</label><strong>{note.client.documentNumber || '—'} <em>{note.client.documentType || ''}</em></strong></div>
        <div class="field"><label>Teléfono</label><span>{note.client.phone || '—'}</span></div>
        <div class="field"><label>Periodo</label><span>{note.period.start.slice(0,10)} - {new Date(new Date(note.period.end).getTime()-86400000).toISOString().slice(0,10)}</span></div>
      </div>
    </section>

    <section class="concept">
      <div class="concept-label">Concepto</div>
      <p class="concept-text">
        Comisión por servicio de recaudación
        <span class="rate {note.summary.qualifiesForDiscount ? 'hit' : ''}">
          {note.summary.avgCommissionPercent.toFixed(2)}%{note.summary.qualifiesForDiscount ? ' - 0.05% aplicado' : ''}
        </span>
      </p>
      <p class="concept-sub">{note.summary.txCount} transacciones por Bs {fmt(note.summary.totalGross)} - {note.period.periodLabel}</p>
    </section>

    <table class="minimal">
      <thead>
        <tr><th>Detalle</th><th class="r">Importe (BOB)</th></tr>
      </thead>
      <tbody>
        <tr><td><span class="dim">Bruto recaudado</span> · {note.summary.txCount} ops</td><td class="r">Bs {fmt(note.summary.totalGross)}</td></tr>
        <tr>
          <td>
            Comisión
            <span class="inline-pill">{note.summary.avgCommissionPercent.toFixed(2)}%</span>
            {#if note.summary.hasDiscount}
              <br><span class="dim" style="font-size:11px">Base {(note.summary.baseRate*100).toFixed(2)}% -> {(note.summary.discountRate*100).toFixed(2)}% si &gt; Bs {Number(note.summary.discountThreshold).toLocaleString('es-BO')}{note.summary.qualifiesForDiscount ? ' · aplicado' : ''}</span>
            {/if}
          </td>
          <td class="r"><strong>Bs {fmt(note.summary.totalCommission)}</strong></td>
        </tr>
        <tr class="net"><td>Neto a liquidar a empresa</td><td class="r"><strong>Bs {fmt(note.summary.netAmount)}</strong></td></tr>
      </tbody>
    </table>

    {#if note.payment?.qrDataUrl}
      <div class="qr-section">
        <div class="qr-card">
          <img src={note.payment.qrDataUrl} alt="QR pago comisión" />
          <div class="qr-info">
            <strong>QR para pago</strong>
            <span>Escanea para pagar Bs {fmt(note.payment.amount)} — {note.correlative}</span>
            <span class="dim">Pasarela PAGUI (cuenta PAGUI Empresarial) · Una vez pagado, la nota se marca automáticamente como pagada</span>
            {#if note.payment.paymentUrl}<a href={note.payment.paymentUrl} target="_blank" class="dim" style="font-size:11px;word-break:break-all">{note.payment.paymentUrl}</a>{/if}
          </div>
        </div>
      </div>
    {/if}

    <div class="meta">
      <p><strong>Moneda:</strong> {note.currency} · Escanea el QR para pagar esta comisión. Una vez recibido el pago via pasarela PAGUI, esta nota se marcará automáticamente como pagada.</p>
      <p class="dim">Emitido {new Date(note.issueDate).toLocaleString('es-BO')} · Correlativo {note.correlative} · ID {note.client.id} · {note.period.periodLabel}</p>
    </div>

    <div class="signatures">
      <div class="sig"><div class="line"></div><span>PAGUI — Administración</span></div>
      <div class="sig"><div class="line"></div><span>{note.client.name}</span></div>
    </div>

    <footer class="footer">
      <span>PAGUI · Banco Económico · IATHINGS</span>
      <span class="dim">{note.period.label} · {note.correlative}</span>
    </footer>
  </div>
  {/if}

  <style>
    :global(body){ margin:0; background: var(--bg, #0f0f1a); color: var(--text, #f1f1f9); font-family: Inter, ui-sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .loading{ display:flex; align-items:center; justify-content:center; min-height:60vh; color: var(--text-tertiary, #6a6a8a); }
    .error-card{ max-width:780px; margin:40px auto; padding:24px; background: var(--surface, #1a1a2e); border:1px solid var(--border, #2a2a4a); border-radius:12px; color:#ef4444; }
    .error-card h2{ margin:0 0 8px; color: var(--text, #f1f1f9); font-size:18px; }
    .toolbar{ position:sticky; top:0; z-index:10; background: var(--surface, #1a1a2e); border-bottom:1px solid var(--border, #2a2a4a); }
    .toolbar-inner{ max-width:800px; margin:0 auto; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .toolbar-left{ display:flex; align-items:center; gap:12px; }
    .hint{ font-size:12px; color: var(--text-secondary, #a0a0c0); font-weight:500; }
    .tabs{ display:flex; background: var(--bg, #0f0f1a); border:1px solid var(--border, #2a2a4a); border-radius:999px; padding:2px; }
    .tabs button{ padding:5px 12px; border:none; background:transparent; color: var(--text-secondary, #a0a0c0); font-size:12px; font-weight:600; border-radius:999px; cursor:pointer; }
    .tabs button.active{ background: var(--primary, #6366f1); color:#fff; }
    .toolbar-right{ display:flex; gap:8px; }
    .btn-primary{ padding:8px 14px; background: var(--primary, #6366f1); color:#fff; border:none; border-radius:999px; font-weight:600; font-size:13px; cursor:pointer; }
    .btn-ghost{ padding:8px 12px; background: var(--surface, #1a1a2e); border:1px solid var(--border, #2a2a4a); border-radius:999px; font-size:13px; cursor:pointer; color: var(--text, #f1f1f9); }
    .link{ background:none; border:none; color: var(--primary, #6366f1); cursor:pointer; text-decoration:underline; font-size:inherit; }

    .pdf-wrap{ max-width:800px; margin:16px auto; background:#fff; border:1px solid var(--border, #2a2a4a); border-radius:12px; overflow:hidden; }
    .pdf-head{ display:flex; justify-content:space-between; padding:10px 12px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:11px; color:#64748b; }
    .pdf-head .dim{ color:#94a3b8; }
    .pdf-frame{ width:100%; height:820px; border:none; background:#fff; display:block; }
    .pdf-loading,.pdf-error{ max-width:800px; margin:16px auto; padding:24px; background: var(--surface, #1a1a2e); border:1px solid var(--border, #2a2a4a); border-radius:12px; text-align:center; color: var(--text-secondary, #a0a0c0); }
    .pdf-hint{ max-width:800px; margin:8px auto; text-align:center; font-size:12px; color: var(--text-tertiary, #6a6a8a); }

    .sheet{ max-width:800px; margin:16px auto 32px; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); color:#1e293b; }
    .top-accent{ height:2px; background: #e2e8f0; }
    .header{ display:flex; justify-content:space-between; gap:16px; padding:22px 28px 18px; border-bottom:1px solid #f1f5f9; }
    .brand .mark{ font-size:22px; font-weight:800; letter-spacing: -0.02em; color:#1e293b; }
    .brand-sub{ margin-top:4px; font-size:11px; color:#64748b; }
    .brand-sub span{ margin:0 4px; color:#cbd5e1; }
    .doc-meta{ text-align:right; }
    .doc-kicker{ font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#64748b; font-weight:600; }
    .doc-number{ margin-top:4px; font-size:18px; font-weight:700; letter-spacing:-0.01em; color:#334155; }
    .doc-date{ margin-top:2px; font-size:11px; color:#94a3b8; }

    .card{ margin:18px 28px 0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
    .card-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; }
    .pill{ background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:4px 8px; border-radius:999px; font-size:10px; letter-spacing:0.06em; text-transform:none; font-weight:600; }
    .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:0; }
    .field{ padding:12px 14px; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; }
    .field:nth-child(2n){ border-right:none; }
    .field label{ display:block; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; font-weight:600; margin-bottom:2px; }
    .field strong{ font-size:13px; font-weight:600; color:#1e293b; }
    .field strong em{ font-style:normal; font-weight:500; color:#64748b; }
    .field span{ font-size:13px; color:#334155; }

    .concept{ margin:18px 28px 0; padding:14px 16px; background:#f8fafc; border:1px solid #f1f5f9; border-radius:12px; }
    .concept-label{ font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; font-weight:700; }
    .concept-text{ margin:6px 0 4px; font-size:13.5px; font-weight:600; color:#1e293b; }
    .rate{ margin-left:8px; font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px; background:#fff; border:1px solid #e2e8f0; color:#475569; }
    .rate.hit{ background:#f1f5f9; color:#334155; border-color:#cbd5e1; }
    .concept-sub{ margin:0; font-size:12px; color:#64748b; }

    table.minimal{ width:calc(100% - 56px); margin:18px 28px 0; border-collapse:collapse; }
    table.minimal th{ text-align:left; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700; padding:10px 12px; border-bottom:1px solid #e2e8f0; background:#f8fafc; }
    table.minimal th.r, table.minimal td.r{ text-align:right; }
    table.minimal td{ padding:11px 12px; font-size:13px; border-bottom:1px solid #f1f5f9; color:#1e293b; }
    table.minimal td .dim{ color:#64748b; }
    table.minimal td .inline-pill{ margin-left:6px; font-size:10px; font-weight:600; padding:2px 6px; border-radius:999px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
    table.minimal tr.net td{ font-weight:700; background:#fff; border-top:1px solid #f1f5f9; }

    .qr-section{ margin:18px 28px 0; }
    .qr-card{ display:flex; gap:16px; align-items:center; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; }
    .qr-card img{ width:340px; height:340px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; }
    .qr-info{ display:flex; flex-direction:column; gap:4px; }
    .qr-info strong{ font-size:13px; color:#1e293b; }
    .qr-info span{ font-size:12px; color:#475569; }
    .qr-info .dim{ color:#94a3b8; font-size:11px; }

    .meta{ margin:14px 28px 0; font-size:11.5px; color:#475569; line-height:1.5; }
    .meta .dim{ color:#94a3b8; }
    .meta code{ background:#f1f5f9; padding:1px 4px; border-radius:4px; font-size:11px; }

    .signatures{ display:flex; justify-content:space-between; gap:24px; margin:28px 28px 0; }
    .sig{ flex:1; text-align:center; }
    .sig .line{ height:1px; background:#cbd5e1; margin:24px 0 8px; }
    .sig span{ font-size:11px; color:#64748b; }

    .footer{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 28px; margin-top:18px; border-top:1px solid #f1f5f9; font-size:11px; color:#94a3b8; }

    @media print{
      :global(body){ background:#fff !important; }
      .no-print{ display:none !important; }
      .sheet{ margin:0; border:none; border-radius:0; box-shadow:none; }
      .pdf-wrap{ display:none !important; }
      @page{ margin:14mm 12mm; size: A4; }
    }
    @media (max-width: 640px){
      .header{ flex-direction:column; }
      .doc-meta{ text-align:left; }
      .grid{ grid-template-columns:1fr; }
      .field{ border-right:none; }
      table.minimal{ width:calc(100% - 32px); margin:18px 16px 0; }
      .card{ margin:18px 16px 0; }
      .concept{ margin:18px 16px 0; }
      .meta{ margin:14px 16px 0; }
      .signatures{ margin:28px 16px 0; }
      .pdf-frame{ height:600px; }
    }
  </style>
{/if}
