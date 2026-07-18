<script lang="ts">
  import { get } from 'svelte/store'
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth'
  import api from '$lib/api'
  import Section from '$lib/components/Section.svelte'
  import { Send, CheckCircle2, AlertCircle, ArrowUpRight, Wallet } from '@lucide/svelte'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import OutlineButton from '$lib/components/ui/OutlineButton.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'

  let wallets: any[] = $state([])
  let selectedWallet: any = $state(null)
  let receiverWalletNumber = $state('')
  let amount = $state(0)
  let description = $state('')
  let loading = $state(false)
  let error = $state('')
  let success = $state(false)

  $effect(() => {
    const s: any = get(auth)
    wallets = s.wallets || []
    if (!selectedWallet && wallets.length > 0) selectedWallet = wallets[0]
  })

  async function handleTransfer() {
    if (!selectedWallet) { error = 'Selecciona una billetera origen'; return }
    if (!receiverWalletNumber || !amount || amount <= 0) {
      error = 'Completa todos los campos'
      return
    }
    loading = true
    error = ''
    try {
      const res = await api.transferP2P({
        senderWalletId: String(selectedWallet.id),
        receiverWalletNumber,
        amount,
        description: description || undefined
      }, crypto.randomUUID().slice(0, 32))
      if (res.success) {
        success = true
      } else {
        error = res.message || 'Error al transferir'
      }
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  function reset() {
    success = false
    receiverWalletNumber = ''
    amount = 0
    description = ''
    error = ''
  }
</script>

<PageLayout title="Enviar dinero">

  {#if success}
    <div class="success-body">
      <div class="success-icon">
        <CheckCircle2 size={48} />
      </div>
      <h2 class="success-title">Transferencia exitosa</h2>
      <p class="success-amount">Bs {Number(amount).toFixed(2)}</p>
      <p class="success-desc">{description || 'Sin descripción'}</p>
      <div class="success-actions">
        <OutlineButton onClick={reset} fullWidth>
          <Send size={16} /> Nueva transferencia
        </OutlineButton>
        <OutlineButton onClick={() => goto('/transactions')} fullWidth>
          Ver movimientos
        </OutlineButton>
      </div>
    </div>
  {:else}
    <section class="hero-section">
      <span class="hero-label">Monto a enviar</span>
      <div class="hero-amount-row">
        <span class="hero-currency-sign">Bs</span>
        <input
          type="number"
          bind:value={amount}
          placeholder="0.00"
          class="hero-input"
          step="0.01"
          min="0"
        />
      </div>
      {#if amount > 0}
        <div class="hero-amount-badge">Bs {amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
      {/if}
    </section>

    {#if error}
      <div class="error-msg">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    {/if}

    <Section label="Origen">
      {#if wallets.length > 1}
        <div class="wallet-list">
          {#each wallets as w}
            <button class="wallet-option" class:selected={selectedWallet?.id === w.id} onclick={() => selectedWallet = w}>
              <div class="wallet-option-info">
                <span class="wallet-option-name">{w.name || 'Billetera'}</span>
                <span class="wallet-option-number">{w.walletNumber}</span>
              </div>
              <span class="wallet-option-balance">Bs {Number(w.balance || 0).toFixed(2)}</span>
            </button>
          {/each}
        </div>
      {:else if wallets.length === 1}
        <div class="wallet-single">
          <Wallet size={18} />
          <span>{wallets[0].name || 'Billetera'}</span>
          <span class="wallet-single-number">{wallets[0].walletNumber}</span>
          <span class="wallet-single-balance">Bs {Number(wallets[0].balance || 0).toFixed(2)}</span>
        </div>
      {/if}
    </Section>

    <Section label="Destino">
      <TextField label="N° billetera" bind:value={receiverWalletNumber} placeholder="Número de billetera destino" />
      <TextField label="Descripción (opcional)" bind:value={description} placeholder="¿Para qué es?" />
    </Section>

    <div style="padding: 0 var(--space-4);">
      <PillButton label={loading ? 'Procesando...' : 'Enviar transferencia'} onClick={handleTransfer} {loading} fullWidth />
    </div>

    <div class="info-note">
      <Send size={14} />
      <span>Transferencia instantánea sin comisión</span>
    </div>
  {/if}
</PageLayout>

<style>
  .hero-section {
    background: var(--primary);
    padding: var(--space-6);
    text-align: center;
    color: white;
    margin: 0 var(--space-4);
    border-radius: var(--radius-xl);
  }
  .hero-label {
    font-size: var(--text-xs); font-weight: 500;
    opacity: 0.8; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .hero-amount-row {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-1); margin-top: var(--space-2);
  }
  .hero-currency-sign { font-size: 2rem; font-weight: 700; opacity: 0.8; }
  .hero-input {
    background: transparent; border: none; color: white;
    font-size: 2.5rem; font-weight: 700; text-align: center;
    width: 200px; outline: none; padding: 0; line-height: 1.1;
  }
  .hero-input::placeholder { color: rgba(255,255,255,0.4); }
  .hero-amount-badge {
    display: inline-block; margin-top: var(--space-3);
    background: rgba(255,255,255,0.15);
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-full);
    color: white; font-size: var(--text-sm); font-weight: 600;
  }
  .error-msg {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: rgba(var(--error-rgb), 0.1);
    color: rgba(var(--error-rgb), 1);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); font-weight: 500;
    margin: 0 var(--space-4);
    animation: fadeIn 0.3s;
  }
  :global(.section-label) { font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(var(--text-tertiary-rgb), 1); margin-bottom: var(--space-2); }
  .wallet-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .wallet-option {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-3); border-radius: var(--radius-lg);
    border: 1.5px solid rgba(var(--border-rgb), 0.5);
    background: rgba(var(--surface-rgb), 0.5); cursor: pointer;
    transition: all 0.15s; text-align: left; width: 100%;
  }
  .wallet-option.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.06); }
  .wallet-option-info { display: flex; flex-direction: column; gap: 2px; }
  .wallet-option-name { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .wallet-option-number { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); font-family: monospace; }
  .wallet-option-balance { font-size: var(--text-sm); font-weight: 700; color: var(--primary); }
  .wallet-single {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-3); border-radius: var(--radius-lg);
    background: rgba(var(--surface-rgb), 0.5);
    font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1);
  }
  .wallet-single-number { font-family: monospace; color: rgba(var(--text-tertiary-rgb), 1); }
  .wallet-single-balance { margin-left: auto; font-weight: 700; color: var(--primary); }
  .info-note {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-2); padding: var(--space-3);
    font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1);
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
