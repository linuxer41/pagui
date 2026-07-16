<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import Section from '$lib/components/Section.svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import AmountField from '$lib/components/ui/AmountField.svelte'
  import { QrCode, Scan, ChevronRight } from '@lucide/svelte'

  let mode = $state<'generate' | 'pay'>('generate')

  let amount = $state(0)
  let description = $state('')
  let currency = $state('BOB')
  let singleUse = $state(true)
  let dueDate = $state(new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16))
  let loading = $state(false)
  let error = $state('')

  let modifyAmount = $derived(!amount || amount === 0)

  async function generate() {
    if (!amount || amount <= 0) { error = 'Ingresa un monto válido'; return }
    loading = true; error = ''
    try {
      const res = await api.generateQR({
        amount, description, bankId: 1,
        transactionId: `TX-${Date.now()}`, accountNumber: '12345678',
        currency, dueDate: new Date(dueDate).toISOString(), singleUse, modifyAmount,
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
      <button class="seg-item" class:active={mode === 'generate'} onclick={() => { mode = 'generate'; error = '' }}>
        <QrCode size={16} /> Cobrar
      </button>
      <button class="seg-item" class:active={mode === 'pay'} onclick={() => goto('/qr/scan?mode=pay')}>
        <Scan size={16} /> Pagar
      </button>
    </div>
    <button class="history-link" onclick={() => goto('/qr/history')}>
      Historial <ChevronRight size={14} />
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if mode === 'generate'}
    <AmountField label="Monto a cobrar" bind:value={amount} bind:currency placeholder="0.00" />
    <div class="field">
      <label class="field-label" for="concepto">Concepto <span class="field-optional">(Opcional)</span></label>
      <div class="field-wrap">
        <textarea id="concepto" bind:value={description} placeholder="Producto o servicio" class="field-textarea" rows="2"></textarea>
      </div>
    </div>
    <Section>
      <div class="row">
        <div class="group">
          <span class="label">Uso único</span>
          <div class="tw">
            <button class="toggle" class:active={singleUse} onclick={() => singleUse = !singleUse} aria-label="Alternar uso único">
              <div class="knob"></div>
            </button>
            <span class="hint">{singleUse ? '1 pago' : 'Múltiples'}</span>
          </div>
        </div>
        <div class="group">
          <span class="label">Vence</span>
          <input type="datetime-local" bind:value={dueDate} class="date" />
        </div>
      </div>
    </Section>
    <PillButton label={loading ? 'Generando...' : 'Generar QR'} onClick={generate} loading={loading} fullWidth />
  {/if}
</div>

<style>
  .page { max-width: 400px; margin: 0 auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
  .error { padding: var(--space-2) var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-m); font-size: var(--text-sm); }
  .top-row { display: flex; align-items: center; gap: var(--space-2); }
  .seg { display: flex; gap: var(--space-1); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-m); padding: var(--space-1); border: 1px solid var(--border); flex: 1; }
  .history-link { display: flex; align-items: center; gap: var(--space-1); background: none; border: none; color: var(--muted-foreground); font-size: var(--text-sm); cursor: pointer; padding: var(--space-2); white-space: nowrap; }
  .seg-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); border: none; border-radius: var(--radius-m); font-size: var(--text-sm); font-weight: 500; cursor: pointer; color: var(--muted-foreground); background: transparent; }
  .seg-item.active { background: var(--primary); color: var(--primary-foreground); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
  .group { display: flex; flex-direction: column; gap: var(--space-2); }
  .label { font-size: var(--text-xs); font-weight: 500; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.5px; }
  .hint { font-size: var(--text-xs); color: var(--muted-foreground); }
  .tw { display: flex; align-items: center; gap: var(--space-2); }
  .toggle { width: 40px; height: 22px; background: var(--input); border-radius: 999px; border: none; padding: 0; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle.active { background: var(--primary); }
  .knob { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.2s; }
  .toggle.active .knob { transform: translateX(18px); }
  .date { height: 40px; padding: 0 var(--space-3); border: 1px solid var(--input); border-radius: var(--radius-m); background: var(--background); color: var(--foreground); font-size: var(--text-sm); outline: none; cursor: pointer; }
  .date:focus { border-color: var(--ring); }
  .date::-webkit-calendar-picker-indicator { filter: invert(0.7); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: var(--foreground); }
  .field-optional { font-weight: 400; color: var(--muted-foreground); font-size: var(--text-xs); }
  .field-wrap { display: flex; border: 1px solid var(--input); border-radius: var(--radius-m); background: var(--background); transition: border-color var(--duration-fast); }
  .field-wrap:focus-within { border-color: var(--ring); }
  .field-textarea { flex: 1; border: none; background: transparent; font-size: var(--text-sm); color: var(--foreground); outline: none; padding: var(--space-2) var(--space-3); resize: none; font-family: inherit; line-height: 1.4; }
</style>
