<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { CreditCard, Building2, User, Eye, EyeOff } from '@lucide/svelte';

  let showBalances = $state(true);
  let wallets = $derived($auth.wallets || []);

  function fmt(amount: string, currency: string): string {
    const n = parseFloat(amount);
    return isNaN(n) ? 'Bs 0.00' : new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  }

  function typeLabel(type: string): string {
    return type === 'business' ? 'Empresarial' : type === 'standard' ? 'Estándar' : type;
  }
</script>

<PageLayout title="Cuentas">
  <div class="page">
    <div class="toolbar">
      <span class="toolbar-count">{wallets.length} billetera{wallets.length !== 1 ? 's' : ''}</span>
      <button class="eye-btn" onclick={() => showBalances = !showBalances} aria-label={showBalances ? 'Ocultar' : 'Mostrar'}>
        {#if showBalances}<Eye size={18} />{:else}<EyeOff size={18} />{/if}
      </button>
    </div>

    <div class="list">
      {#if wallets.length > 0}
        {#each wallets as w (w.id)}
          <div class="card" class:prime={w.isPrimary}>
            <div class="card-head">
              <div class="card-badge" class:biz={w.type === 'business'}>
                {#if w.type === 'business'}<Building2 size={13} />{:else}<User size={13} />{/if}
                {typeLabel(w.type)}
              </div>
              <div class="card-dot" class:on={w.status === 'active'}></div>
            </div>
            <div class="card-body">
              <div class="card-number">{w.walletNumber}</div>
              <div class="card-bal">
                {#if showBalances}{fmt(w.availableBalance, w.currency)}{:else}••••••{/if}
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <EmptyState icon={CreditCard} title="Sin cuentas" message="No tienes billeteras asociadas" />
      {/if}
    </div>
  </div>
</PageLayout>

<style>
  .page { padding: var(--space-4); }
  .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
  .toolbar-count { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .eye-btn { width: 36px; height: 36px; border-radius: var(--radius-full); border: none; background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-secondary-rgb), 1); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .eye-btn:active { opacity: 0.7; }
  .list { display: flex; flex-direction: column; gap: var(--space-3); }
  .card { background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.08) 0%, #1a1a1a 60%); border-radius: var(--radius-xl); padding: var(--space-5); color: #fff; position: relative; overflow: hidden; }
  .card.prime { background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.35) 0%, #1a1a1a 60%); }
  .card.prime::before { content: ''; position: absolute; top: -40%; right: -20%; width: 180px; height: 180px; border-radius: 50%; background: rgba(var(--primary-rgb), 0.12); }
  .card.prime::after { content: 'Principal'; position: absolute; top: var(--space-3); right: var(--space-3); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); background: rgba(var(--primary-rgb), 0.2); padding: 2px 8px; border-radius: var(--radius-full); z-index: 1; }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); position: relative; z-index: 1; }
  .card-badge { display: flex; align-items: center; gap: 4px; font-size: var(--text-xs); font-weight: 600; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: var(--radius-full); }
  .card-badge.biz { background: rgba(var(--primary-rgb), 0.25); color: var(--primary); }
  .card-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.15); flex-shrink: 0; }
  .card-dot.on { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.5); }
  .card-body { position: relative; z-index: 1; }
  .card-number { font-size: var(--text-xs); font-family: var(--font-mono); color: rgba(255,255,255,0.35); margin-bottom: var(--space-1); }
  .card-bal { font-size: var(--text-2xl); font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.5px; }
</style>
