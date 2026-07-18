<script lang="ts">
  import { get } from 'svelte/store'
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth'
  import api from '$lib/api'
  import { QrCode, Scan, ChevronRight, Calendar } from '@lucide/svelte'
  import WalletTabs from '$lib/components/composite/WalletTabs.svelte'

  let mode = $state<'generate' | 'pay'>('generate')

  let centsStr = $state('')
  let description = $state('')
  let singleUse = $state(true)
  let datePreset = $state<'1d' | '1w' | '1m' | '1y'>('1m')
  let datePick = $state('')
  let loading = $state(false)
  let error = $state('')

  let dueDate = $derived.by(() => {
    if (datePick) return datePick
    const d = new Date()
    if (datePreset === '1d') d.setDate(d.getDate() + 1)
    else if (datePreset === '1w') d.setDate(d.getDate() + 7)
    else if (datePreset === '1m') d.setMonth(d.getMonth() + 1)
    else if (datePreset === '1y') d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 16)
  })

  let wallets: any[] = $state([])
  let selectedWallet: any = $state(null)

  $effect(() => {
    const s: any = get(auth)
    wallets = s.wallets || []
    if (!selectedWallet && wallets.length > 0) selectedWallet = wallets[0]
  })

  let amount = $derived(parseInt(centsStr || '0', 10) / 100)
  let currency = $derived(selectedWallet?.currency || 'BOB')
  let symbol = $derived(currency === 'BOB' ? 'Bs' : '$')
  let modifyAmount = $derived(!singleUse || !amount || amount === 0)

  function fmt(n: number) {
    const [int, dec] = n.toFixed(2).split('.')
    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
  }
  let displayVal = $derived(centsStr ? fmt(amount) : '')

  function handleAmountInput(e: Event) {
    const el = e.target as HTMLInputElement
    const digits = el.value.replace(/\D/g, '')
    centsStr = digits
    el.value = digits ? fmt(parseInt(digits || '0', 10) / 100) : ''
  }

  let displayDate = $derived(
    new Date(dueDate).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    })
  )

  async function generate() {
    if (!amount || amount <= 0) { error = 'Ingresa un monto válido'; return }
    loading = true; error = ''
    try {
      const res = await api.generateQR({
        amount, description, bankId: 1,
        transactionId: `TX-${Date.now()}`,
        currency, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined, singleUse, modifyAmount,
        walletId: selectedWallet?.id,
      })
      if (!res.success) throw new Error(res.message || 'Error al generar QR')
      if (res.data) {
        localStorage.setItem('qrDataForStatus', JSON.stringify(res.data))
        goto(`/qr/status?id=${res.data.qrId}`)
      }
    } catch (err: any) { error = err.message || 'Error de conexión' }
    finally { loading = false }
  }
</script>

<div class="page">
  <div class="top-row">
    <div class="seg">
      <button class="seg-item" class:sel={mode === 'generate'} onclick={() => { mode = 'generate'; centsStr = ''; error = '' }} type="button">
        <QrCode size={15} /> Cobrar
      </button>
      <button class="seg-item" class:sel={mode === 'pay'} onclick={() => goto('/qr/scan?mode=pay')} type="button">
        <Scan size={15} /> Pagar
      </button>
    </div>
    <button class="history-link" onclick={() => goto('/qr/history')}>
      Historial <ChevronRight size={13} />
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if mode === 'generate'}
    <div class="section">
      <span class="sec-label">Destino</span>
      <WalletTabs {wallets} selected={selectedWallet} onSelect={(w) => selectedWallet = w} />
    </div>

    <div class="section">
      <span class="sec-label">Monto</span>
      <div class="amt-box">
        <div class="amt-row">
          <span class="amt-sym">{symbol}</span>
          <input
            type="text" inputmode="numeric"
            oninput={handleAmountInput}
            placeholder="0.00" class="amt-inp"
          />
        </div>
      </div>
    </div>

    <div class="section">
      <span class="sec-label">Concepto <span class="sec-muted">(opcional)</span></span>
      <textarea bind:value={description} placeholder="Producto o servicio" class="inp-area" rows="2"></textarea>
    </div>

    <div class="section">
      <span class="sec-label">Vencimiento</span>
      <div class="v-line">
        <div class="date-presets">
          <button class="dpill" class:sel={!datePick && datePreset === '1d'} onclick={() => { datePreset = '1d'; datePick = '' }} type="button">1 día</button>
          <button class="dpill" class:sel={!datePick && datePreset === '1w'} onclick={() => { datePreset = '1w'; datePick = '' }} type="button">1 sem</button>
          <button class="dpill" class:sel={!datePick && datePreset === '1m'} onclick={() => { datePreset = '1m'; datePick = '' }} type="button">1 mes</button>
          <button class="dpill" class:sel={!datePick && datePreset === '1y'} onclick={() => { datePreset = '1y'; datePick = '' }} type="button">1 año</button>
        </div>
      </div>
      <label class="date-chip">
        <Calendar size={14} />
        <span class="date-txt">{displayDate}</span>
        <input type="datetime-local" bind:value={datePick} class="date-hidden" />
      </label>
    </div>

    <div class="radio-line">
      <label class="radio-item" class:sel={singleUse}>
        <input type="radio" name="usos" checked={singleUse} onchange={() => singleUse = true} />
        <span class="radio-dot"></span>
        1 pago
      </label>
      <label class="radio-item" class:sel={!singleUse}>
        <input type="radio" name="usos" checked={!singleUse} onchange={() => singleUse = false} />
        <span class="radio-dot"></span>
        Múltiples pagos
      </label>
    </div>

    <button class="gen-btn" onclick={generate} disabled={loading}>
      {#if loading}
        <span class="gen-spin"></span>
        Generando...
      {:else}
        <QrCode size={18} />
        Generar QR
      {/if}
    </button>
  {/if}
</div>

<style>
  .page {
    max-width: 400px; margin: 0 auto;
    padding: var(--space-4) var(--space-4) var(--space-8);
    display: flex; flex-direction: column; gap: var(--space-4);
  }

  .top-row { display: flex; align-items: center; gap: var(--space-2); }
  .seg { display: flex; gap: 3px; background: var(--muted); border-radius: var(--radius-m); padding: 3px; border: 1px solid var(--border); flex: 1; }
  .history-link { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--muted-foreground); font-size: var(--text-sm); cursor: pointer; padding: var(--space-2); white-space: nowrap; transition: color var(--duration-fast); }
  .history-link:hover { color: var(--foreground); }
  .seg-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: none; border-radius: var(--radius-m); font-size: var(--text-sm); font-weight: 600; cursor: pointer; color: var(--muted-foreground); background: transparent; transition: all var(--duration-fast); }
  .seg-item.sel { background: var(--secondary); color: var(--foreground); }

  .error { padding: var(--space-2) var(--space-3); background: var(--color-error); color: var(--color-error-foreground); border-radius: var(--radius-m); font-size: var(--text-sm); border: 1px solid rgba(var(--error-rgb), 0.2); }

  .section { display: flex; flex-direction: column; gap: var(--space-2); }
  .sec-label { font-size: 11px; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.8px; }
  .sec-muted { font-weight: 400; color: rgba(var(--text-secondary-rgb), 0.5); text-transform: none; letter-spacing: 0; }

  .amt-box {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }
  .amt-row {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-5) var(--space-5) var(--space-3);
  }
  .amt-sym { font-size: var(--text-2xl); font-weight: 700; color: var(--muted-foreground); flex-shrink: 0; line-height: 1; }
  .amt-inp {
    flex: 1; border: none; background: transparent;
    font-size: var(--text-2xl); font-weight: 700; color: var(--foreground);
    outline: none; padding: 0; min-width: 0;
    letter-spacing: -0.5px;
    text-align: right;
  }
  .amt-inp::placeholder { color: var(--muted-foreground); opacity: 0.4; }

  .inp-area {
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--card);
    font-size: var(--text-sm); color: var(--foreground);
    outline: none; padding: var(--space-3); resize: none;
    font-family: inherit; line-height: 1.5;
    transition: border-color var(--duration-fast);
  }
  .inp-area::placeholder { color: var(--muted-foreground); opacity: 0.5; }
  .inp-area:focus { border-color: var(--ring); }

  .v-line { display: flex; align-items: center; gap: var(--space-2); }
  .date-presets { display: flex; gap: var(--space-2); flex: 1; }

  .radio-line { display: flex; gap: var(--space-4); justify-content: center; padding: var(--space-2) 0; }
  .radio-item { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--text-sm); font-weight: 500; color: var(--muted-foreground); transition: color var(--duration-fast); user-select: none; }
  .radio-item.sel { color: var(--foreground); }
  .radio-item input { position: absolute; opacity: 0; pointer-events: none; }
  .radio-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; transition: all var(--duration-fast); flex-shrink: 0; }
  .radio-dot::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); transform: scale(0); transition: transform var(--duration-fast); }
  .radio-item.sel .radio-dot { border-color: var(--primary); }
  .radio-item.sel .radio-dot::after { transform: scale(1); }
  .dpill {
    flex: 1; padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--card);
    font-size: 11px; font-weight: 600; color: var(--muted-foreground);
    cursor: pointer; text-align: center;
    transition: all var(--duration-fast);
  }
  .dpill:hover { border-color: var(--ring); }
  .dpill.sel { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.08); color: var(--primary); }

  .date-chip {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--card);
    position: relative;
    height: 40px;
    transition: border-color var(--duration-fast);
  }
  .date-chip:focus-within { border-color: var(--ring); }
  .date-chip :global(svg) { color: var(--muted-foreground); flex-shrink: 0; }
  .date-txt { font-size: 11px; font-weight: 600; color: var(--foreground); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .date-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  .gen-btn {
    display: flex; align-items: center; justify-content: center; gap: var(--space-2);
    width: 100%; padding: var(--space-4);
    border: none; border-radius: var(--radius-xl);
    background: var(--primary);
    color: var(--primary-foreground);
    font-size: var(--text-base); font-weight: 700;
    cursor: pointer; transition: opacity var(--duration-fast);
    letter-spacing: 0.3px;
    margin-top: var(--space-1);
  }
  .gen-btn:disabled { opacity: 0.4; cursor: default; }
  .gen-btn:not(:disabled):hover { opacity: 0.9; }
  .gen-spin { width: 16px; height: 16px; border: 2px solid rgba(0,0,0,0.2); border-top-color: var(--primary-foreground); border-radius: 50%; animation: spin 0.6s linear infinite; }
</style>