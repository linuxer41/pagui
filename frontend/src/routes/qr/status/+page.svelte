<script lang="ts">
  import api from '$lib/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
import { CheckCircle, Clock, RefreshCw, Loader, Download, Share2 } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';
  import { onSSEEvent } from '$lib/services/sseService';

  let qrId = $state('')
  let qrData = $state<any>(null)
  let qrImage = $state('')
  let loading = $state(true)
  let verifying = $state(false)
  let error = $state('')
  let countdown = $state(600)
  let countdownInterval: any
  let pollInterval: any
  let payments = $state<any[]>([])
  let showSuccess = $state(false)
  let paymentData = $state<any>(null)

  onMount(() => {
    const id = page.url.searchParams.get('id')
    if (!id) { error = 'QR no encontrado'; loading = false; return }
    qrId = id
    load(id)
  })

  onDestroy(() => {
    clearInterval(countdownInterval)
    clearInterval(pollInterval)
  })

  async function load(id: string) {
    try {
      const res = await api.getQR(id)
      if (res.success && res.data) {
        qrData = res.data
        if (res.data.qrImage) qrImage = `data:image/png;base64,${res.data.qrImage}`
        setupCountdown()
        startPolling()
      } else {
        error = res.message || 'Error al cargar QR'
      }
    } catch (err: any) {
      error = err.message || 'Error de conexión'
    } finally {
      loading = false
    }
  }

  function setupCountdown() {
    if (!qrData?.dueDate) return
    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000)
  }

  function updateCountdown() {
    if (!qrData?.dueDate) return
    const remaining = Math.max(0, Math.floor((new Date(qrData.dueDate).getTime() - Date.now()) / 1000))
    countdown = remaining
    if (remaining <= 0) {
      clearInterval(countdownInterval)
      clearInterval(pollInterval)
    }
  }

  function startPolling() {
    pollInterval = setInterval(async () => {
      if (countdown <= 0) { clearInterval(pollInterval); return }
      try {
        const res = await api.getQRPayments(qrId)
        if (res.success && res.data?.payments?.length) {
          payments = res.data.payments
          paymentData = payments[0]
          showSuccess = true
          clearInterval(pollInterval)
        }
      } catch {}
    }, 15000)
  }

  async function checkStatus() {
    if (!qrId) return
    verifying = true
    try {
      const res = await api.getQRPayments(qrId)
      if (res.success && res.data?.payments?.length) {
        payments = res.data.payments
        paymentData = payments[0]
        showSuccess = true
      }
    } finally {
      verifying = false
    }
  }

  function formatAmount(n: number, cur: string) {
    const f = n.toLocaleString('es-BO', { minimumFractionDigits: 2 })
    return cur === 'BOB' ? `Bs ${f}` : `$${f}`
  }

  function formatDate(s: string) {
    if (!s) return ''
    return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  async function downloadQR() {
    try {
      const { toBlob } = await import('html-to-image')
      const el = document.querySelector('.qr-visual') as HTMLElement
      if (!el) return
      const blob = await toBlob(el, { backgroundColor: '#ffffff', pixelRatio: 2 })
      if (!blob) return
      const buffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(buffer)
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({
        defaultPath: `qr-${qrData?.transactionId || 'pagui'}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }]
      })
      if (path) {
        await writeFile(path, uint8)
      }
    } catch {}
  }

  async function shareQR() {
    try {
      const { toBlob } = await import('html-to-image')
      const el = document.querySelector('.qr-visual') as HTMLElement
      if (!el) return
      const blob = await toBlob(el, { backgroundColor: '#ffffff', pixelRatio: 2 })
      if (!blob) return

      try {
        const { shareFile } = await import('tauri-plugin-share')
        const buffer = await blob.arrayBuffer()
        const uint8 = new Uint8Array(buffer)
        const { writeFile } = await import('@tauri-apps/plugin-fs')
        const { appDataDir } = await import('@tauri-apps/api/path')
        const dir = await appDataDir()
        const tmpPath = `${dir}qr-${qrData?.transactionId || 'pagui'}.png`
        await writeFile(tmpPath, uint8)
        await shareFile(tmpPath, 'image/png')
        return
      } catch {}

      try {
        const file = new File([blob], `qr-${qrData?.transactionId || 'pagui'}.png`, { type: 'image/png' })
        if (navigator.share) {
          await navigator.share({ title: 'QR Pagui', files: [file] })
          return
        }
      } catch {}

      downloadQR()
    } catch { downloadQR() }
  }
</script>

<svelte:head>
  <title>QR | Pagui</title>
</svelte:head>

<PageLayout title="QR">
  {#if loading}
    <div class="loading"></div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
      <button class="link" onclick={() => goto('/qr')}>Generar nuevo QR</button>
    </div>
  {:else if qrData}
    <div class="qr-visual">
      {#if qrData.status === 'active'}
      <div class="qr-status">
        <div class="status-dot"></div>
        <span>Esperando pago</span>
        <button class="refresh-sm" onclick={checkStatus} disabled={verifying}>
          {#if verifying}<Loader size={14} class="spin" />{:else}<RefreshCw size={14} />{/if}
        </button>
      </div>
      {/if}
      {#if qrImage}
        <img src={qrImage} alt="QR" class="qr-img" />
      {/if}
      <div class="qr-info">
        <div class="amount">{formatAmount(qrData.amount, qrData.currency)}</div>
        {#if qrData.description}
          <div class="desc">{qrData.description}</div>
        {/if}
      </div>
    </div>

    <div class="actions">
      <button class="action primary" onclick={shareQR}><Share2 size={14} /> Compartir</button>
      <button class="action" onclick={downloadQR}><Download size={14} /> Descargar</button>
    </div>

    <div class="meta">
      <div class="meta-row"><span>ID</span><span class="mono">{qrData.transactionId}</span></div>
      <div class="meta-row"><span>Vence</span><span>{formatDate(qrData.dueDate)}</span></div>
      <div class="meta-row"><span>Uso único</span><span>{qrData.singleUse ? 'Sí' : 'No'}</span></div>
      <div class="meta-row"><span>Modificar monto</span><span>{qrData.modifyAmount ? 'Sí' : 'No'}</span></div>
    </div>

    {#if payments.length > 0}
      <div class="payments">
        <h3>Pagos</h3>
        {#each payments as p, i}
          <div class="payment">
            <div class="payment-head">
              <span>Pago #{i + 1}</span>
              <span class="amount">{p.currency} {p.amount.toFixed(2)}</span>
            </div>
            <div class="payment-detail"><span>Pagado por</span><span>{p.senderName || '—'}</span></div>
            <div class="payment-detail"><span>Fecha</span><span>{formatDate(p.paymentDate)}</span></div>
            <div class="payment-detail"><span>Transacción</span><span class="mono">{p.transactionId}</span></div>
          </div>
        {/each}
      </div>
    {/if}

    {#if countdown <= 0 && qrData.status === 'active'}
      <div class="expired">
        <Clock size={24} />
        <p>QR expirado</p>
        <button class="btn" onclick={() => goto('/qr')}>Generar nuevo</button>
      </div>
    {/if}
  {/if}
</PageLayout>

{#if showSuccess && paymentData}
  <button class="overlay" onclick={() => showSuccess = false} onkeydown={(e) => e.key === 'Escape' && (showSuccess = false)}>
    <div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (showSuccess = false)}>
      <CheckCircle size={40} class="icon-success" />
      <p class="success-msg">Pago recibido</p>
      <div class="pay-details">
        <div class="pay-row"><span>Monto</span><span>{formatAmount(paymentData.amount, paymentData.currency)}</span></div>
        <div class="pay-row"><span>Pagado por</span><span>{paymentData.senderName || '—'}</span></div>
        <div class="pay-row"><span>Fecha</span><span>{formatDate(paymentData.paymentDate)}</span></div>
        <div class="pay-row"><span>Transacción</span><span class="mono">{paymentData.transactionId}</span></div>
      </div>
    </div>
  </button>
{/if}

<style>
  .loading { width: 200px; height: 200px; margin: var(--space-8) auto; background: var(--muted); border-radius: var(--radius-m); animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
  .error { text-align: center; padding: var(--space-8); color: var(--foreground); }
  .link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: var(--text-sm); margin-top: var(--space-2); }

  .qr-visual { background: white; border-radius: var(--radius-m); padding: var(--space-6) var(--space-8); text-align: center; }
  .qr-status { display: flex; align-items: center; justify-content: center; gap: var(--space-2); font-size: var(--text-sm); color: #111; margin-bottom: var(--space-4); }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success-foreground); animation: pulse 1.5s infinite; }
  .refresh-sm { background: none; border: none; color: var(--primary); cursor: pointer; padding: 0; display: flex; }
  .qr-img { width: 240px; height: 240px; margin: 0 auto; display: block; }
  .qr-info { margin-top: var(--space-4); }
  .amount { font-size: var(--text-xl); font-weight: 700; color: #111; }
  .desc { font-size: var(--text-sm); color: #666; margin-top: var(--space-1); }

  .actions { display: flex; gap: var(--space-2); }
  .action { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); height: 40px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--foreground); font-size: var(--text-sm); cursor: pointer; }
  .action.primary { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }

  .meta { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }
  .meta-row { display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
  .meta-row span:first-child { color: var(--muted-foreground); }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }

  .payments h3 { font-size: var(--text-sm); font-weight: 600; margin: 0 0 var(--space-3); }
  .payment { padding: var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-m); font-size: var(--text-sm); display: flex; flex-direction: column; gap: var(--space-1); }
  .payment-head { display: flex; justify-content: space-between; font-weight: 600; }
  .payment-head .amount { font-size: var(--text-sm); font-weight: 700; }
  .payment-detail { display: flex; justify-content: space-between; color: var(--muted-foreground); }
  .payment-detail span:last-child { color: var(--foreground); }

  .expired { text-align: center; padding: var(--space-8); color: var(--color-error-foreground); display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
  .btn { height: 40px; padding: 0 var(--space-6); border: none; border-radius: var(--radius-pill); background: var(--primary); color: var(--primary-foreground); cursor: pointer; }

  .overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .modal { background: var(--background); border-radius: var(--radius-m); padding: var(--space-6); max-width: 320px; width: 90%; text-align: center; }
  :global(.icon-success) { margin: 0 auto var(--space-3); color: var(--color-success-foreground); }
  .success-msg { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-4); }
  .pay-details { display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--text-sm); }
  .pay-row { display: flex; justify-content: space-between; }
  .pay-row span:first-child { color: var(--muted-foreground); }
</style>
