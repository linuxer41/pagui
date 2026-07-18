<script lang="ts">
  import { Wallet } from '@lucide/svelte';

  let { wallet }: { wallet: any } = $props();
</script>

<div class="wallet-info">
  <div class="wallet-info-icon"><Wallet size={18} /></div>
  <div class="wallet-info-body">
    <span class="wallet-info-title">{wallet?.name || 'Sin nombre'}</span>
    <span class="wallet-info-number">{wallet?.walletNumber || ''}</span>
  </div>
</div>

<style>
  .wallet-info { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }
  .wallet-info-icon { width: 36px; height: 36px; border-radius: var(--radius-lg); background: rgba(var(--primary-rgb), 0.08); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wallet-info-body { display: flex; flex-direction: column; gap: 1px; flex: 1; }
  .wallet-info-title { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .wallet-info-number { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
</style>
