<script lang="ts">
  let {
    wallets = [],
    selected,
    onSelect
  }: {
    wallets: any[]
    selected: any
    onSelect: (w: any) => void
  } = $props()
</script>

<div class="wallet-tabs">
  {#each wallets as w (w.id)}
    <button class="wallet-tab" class:active={selected?.id === w.id} onclick={() => onSelect(w)}>
      <span class="tab-name">{w.name || 'Billetera'}</span>
      <span class="tab-acct">{w.walletNumber || w.wallet_number || ''}</span>
    </button>
  {/each}
</div>

<style>
  .wallet-tabs { display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; padding-bottom: var(--space-1); }
  .wallet-tabs::-webkit-scrollbar { display: none; }
  .wallet-tab { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: var(--space-2) var(--space-3); border: none; border-bottom: 2px solid transparent; background: transparent; color: rgba(var(--text-tertiary-rgb), 1); cursor: pointer; white-space: nowrap; transition: color var(--duration-fast), border-color var(--duration-fast); }
  .wallet-tab.active { color: rgba(var(--text-primary-rgb), 1); border-bottom-color: var(--primary); }
  .tab-name { font-size: var(--text-sm); font-weight: 600; line-height: 1.2; }
  .tab-acct { font-size: var(--text-xs); font-weight: 400; opacity: 0.7; font-family: var(--font-mono); }
</style>
