<script lang="ts">
  let { balance = 0 as number, currency = 'BOB' as string, cardType = 'Débito' as string } = $props()
  let symbol = $derived(currency === 'BOB' ? 'Bs' : '$')
</script>

<div class="balance-card">
  <span class="balance-label">Saldo disponible</span>
  <div class="balance-row">
    <span class="balance-symbol">{symbol}</span>
    <span class="balance-value">{balance.toFixed(2)}</span>
  </div>
  <span class="balance-type">{cardType} • {currency}</span>
</div>

<style>
  .balance-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    background: rgba(var(--surface-rgb), 1);
  }
  .balance-label {
    font-size: var(--text-xs);
    color: rgba(var(--text-tertiary-rgb), 1);
    letter-spacing: 0.5px;
  }
  .balance-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }
  .balance-symbol {
    font-size: var(--text-lg);
    font-weight: 700;
    color: rgba(var(--text-secondary-rgb), 1);
  }
  .balance-value {
    font-size: var(--text-2xl);
    font-weight: 800;
    font-family: var(--font-mono);
    color: rgba(var(--text-primary-rgb), 1);
    letter-spacing: -0.03em;
  }
  .balance-type {
    font-size: var(--text-xs);
    color: rgba(var(--text-tertiary-rgb), 0.7);
  }
</style>
