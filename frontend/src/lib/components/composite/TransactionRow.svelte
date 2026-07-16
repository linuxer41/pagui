<script lang="ts">
  import { ArrowUpRight, ArrowDownLeft } from '@lucide/svelte'
  interface Tx {
    id: string; type: 'send' | 'receive'; amount: number;
    counterparty: string; date: string; status: string; currency: string;
  }
  let { tx = {} as Tx } = $props()
  let isSend = $derived(tx.type === 'send')
  let symbol = $derived(tx.currency === 'BOB' ? 'Bs' : '$')
</script>

<button class="tx-row">
  <div class="tx-icon" class:send={isSend} class:receive={!isSend}>
    {#if isSend}<ArrowUpRight size={16} />{:else}<ArrowDownLeft size={16} />{/if}
  </div>
  <div class="tx-info">
    <span class="tx-counterparty">{tx.counterparty}</span>
    <span class="tx-date">{tx.date}</span>
  </div>
  <div class="tx-amount-col">
    <span class="tx-amount" class:send={isSend} class:receive={!isSend}>
      {isSend ? '-' : '+'}{symbol}{tx.amount.toFixed(2)}
    </span>
    <span class="tx-status">{tx.status}</span>
  </div>
</button>

<style>
  .tx-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: none;
    border-radius: var(--radius-lg);
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background var(--duration-fast);
    text-align: left;
  }
  .tx-row:active { background: rgba(var(--surface-rgb), 1); }
  .tx-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }
  .tx-icon.send { background: rgba(var(--error-rgb), 0.15); color: rgba(var(--error-rgb), 1); }
  .tx-icon.receive { background: rgba(var(--success-rgb), 0.15); color: rgba(var(--success-rgb), 1); }
  .tx-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .tx-counterparty {
    font-size: var(--text-sm);
    font-weight: 600;
    color: rgba(var(--text-primary-rgb), 1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tx-date {
    font-size: var(--text-xs);
    color: rgba(var(--text-tertiary-rgb), 1);
  }
  .tx-amount-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .tx-amount {
    font-size: var(--text-sm);
    font-weight: 700;
    font-family: var(--font-mono);
  }
  .tx-amount.send { color: rgba(var(--error-rgb), 1); }
  .tx-amount.receive { color: rgba(var(--success-rgb), 1); }
  .tx-status {
    font-size: var(--text-xs);
    color: rgba(var(--text-tertiary-rgb), 1);
  }
</style>
