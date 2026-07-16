<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import api from '$lib/api'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import { CheckCircle2, AlertCircle, User, Wallet, FileText } from '@lucide/svelte'

  let qrParam = $page.url.searchParams.get('data') || ''
  let parsed: Record<string, string>
  try { parsed = JSON.parse(decodeURIComponent(qrParam)) } catch { parsed = {} }

  let receiverWalletId = parsed.wallet || parsed.receiver || ''
  let amount = Number(parsed.amount) || 0
  let currency = parsed.currency || 'BOB'
  let description = parsed.concept || parsed.description || ''
  let clientName = parsed.name || parsed.client || parsed.sender || '—'
  let loading = $state(false)
  let error = $state('')
  let success = $state(false)

  async function handlePay() {
    if (!receiverWalletId || !amount || amount <= 0) {
      error = 'Datos de pago inválidos'
      return
    }
    loading = true; error = ''
    try {
      const res = await api.transferP2P({
        receiverWalletId,
        amount,
        description: description || undefined
      }, crypto.randomUUID().slice(0, 32))
      if (res.success) {
        success = true
      } else {
        error = res.message || 'Error al procesar el pago'
      }
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  function reset() {
    success = false
    error = ''
  }
</script>

<PageLayout title="Pagar con QR">
  {#if success}
    <div class="success-body">
      <div class="success-icon">
        <CheckCircle2 size={48} />
      </div>
      <h2 class="success-title">Pago exitoso</h2>
      <p class="success-amount">{currency} {Number(amount).toFixed(2)}</p>
      <p class="success-desc">{description || 'Sin descripción'}</p>
      <div class="success-actions">
        <PillButton label="Ir a inicio" onClick={() => goto('/')} fullWidth />
      </div>
    </div>
  {:else}
    <section class="hero-section">
      <span class="hero-label">Monto a pagar</span>
      <div class="hero-amount-display">{currency} {Number(amount).toFixed(2)}</div>
    </section>

    {#if error}
      <div class="error-msg">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    {/if}

    <div class="info-card">
      <div class="info-row">
        <User size={18} class="info-icon" />
        <div class="info-content">
          <span class="info-label">Cliente</span>
          <span class="info-value">{clientName}</span>
        </div>
      </div>
      <div class="info-row">
        <Wallet size={18} class="info-icon" />
        <div class="info-content">
          <span class="info-label">Destino</span>
          <span class="info-value mono">{receiverWalletId}</span>
        </div>
      </div>
      {#if description}
      <div class="info-row">
        <FileText size={18} class="info-icon" />
        <div class="info-content">
          <span class="info-label">Concepto</span>
          <span class="info-value">{description}</span>
        </div>
      </div>
      {/if}
    </div>

    <div style="padding: 0 var(--space-4); margin-top: auto;">
      <PillButton label={loading ? 'Procesando...' : 'Confirmar pago'} onClick={handlePay} {loading} fullWidth />
    </div>
  {/if}
</PageLayout>

<style>
  .hero-section {
    background: var(--primary);
    padding: var(--space-6);
    text-align: center;
    color: white;
    border-radius: var(--radius-xl);
  }
  .hero-label {
    font-size: var(--text-xs); font-weight: 500;
    opacity: 0.8; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .hero-amount-display {
    font-size: 2.5rem; font-weight: 800;
    margin-top: var(--space-2);
  }
  .error-msg {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: rgba(var(--error-rgb), 0.1);
    color: rgba(var(--error-rgb), 1);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); font-weight: 500;
  }
  .info-card {
    display: flex; flex-direction: column;
    background: var(--card); border-radius: var(--radius-xl);
    padding: var(--space-4);
    border: 1px solid var(--border);
    gap: var(--space-3);
  }
  .info-row {
    display: flex; align-items: center; gap: var(--space-3);
  }
  .info-content {
    display: flex; flex-direction: column; gap: 2px;
    min-width: 0;
  }
  .info-label {
    font-size: var(--text-xs); color: var(--muted-foreground);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .info-value {
    font-size: var(--text-sm); font-weight: 500; color: var(--foreground);
    word-break: break-all;
  }
  .info-value.mono {
    font-family: 'JetBrains Mono', monospace; font-size: var(--text-xs);
  }
  .success-body {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4); gap: var(--space-3);
  }
  .success-icon {
    width: 80px; height: 80px; border-radius: var(--radius-full);
    background: rgba(var(--success-rgb), 0.15);
    color: rgba(var(--success-rgb), 1);
    display: flex; align-items: center; justify-content: center;
  }
  .success-title {
    font-size: var(--text-xl); font-weight: 700;
    color: rgba(var(--text-primary-rgb), 1); margin: 0;
  }
  .success-amount {
    font-size: 2rem; font-weight: 800;
    color: var(--primary); margin: 0;
  }
  .success-desc {
    font-size: var(--text-sm);
    color: rgba(var(--text-secondary-rgb), 1); margin: 0;
  }
  .success-actions {
    display: flex; flex-direction: column; gap: var(--space-2);
    width: 100%; max-width: 300px; margin-top: var(--space-4);
  }
</style>
