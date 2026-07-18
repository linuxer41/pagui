<script lang="ts">
  import TransactionRow from './TransactionRow.svelte'
  import Skeleton from '../Skeleton.svelte'
  import EmptyState from '../EmptyState.svelte'
  import Section from '../Section.svelte'
  import { History, ChevronRight } from '@lucide/svelte'

  interface Transaction {
    id: string
    type: 'incoming' | 'outgoing'
    amount: number
    from?: string
    to?: string
    date: string
    status: string
    reference?: string
    category?: string
    metadata?: Record<string, unknown>
  }

  let {
    transactions = [] as Transaction[],
    loading = false,
    emptyTitle = 'Sin movimientos',
    emptyMessage = 'Aún no hay actividad',
    max = 0,
    showSeeAll = false,
    onSeeAll,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    onSelect,
  }: {
    transactions?: Transaction[]
    loading?: boolean
    emptyTitle?: string
    emptyMessage?: string
    max?: number
    showSeeAll?: boolean
    onSeeAll?: () => void
    hasMore?: boolean
    loadingMore?: boolean
    onLoadMore?: () => void
    onSelect?: (tx: Transaction) => void
  } = $props()

  let display = $derived(
    max > 0 ? transactions.slice(0, max) : transactions
  )
</script>

{#if loading}
  <Section>
    <Skeleton width="100%" height="58px" radius="lg" count={max || 5} gap="space-1" />
  </Section>
{:else if transactions.length === 0}
  <EmptyState icon={History} title={emptyTitle} message={emptyMessage} />
{:else}
  <Section>
    {#if showSeeAll}
      <div class="tx-header">
        <span class="tx-header-title">Últimos movimientos</span>
        {#if onSeeAll}
          <button class="see-all-btn" onclick={onSeeAll}>
            Ver todo <ChevronRight size={14} />
          </button>
        {/if}
      </div>
    {/if}
    <div class="tx-list">
      {#each display as tx (tx.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => onSelect?.(tx)}
          onkeydown={(e) => e.key === 'Enter' && onSelect?.(tx)}
        >
          <TransactionRow {tx} />
        </div>
      {/each}
    </div>
    {#if hasMore && onLoadMore}
      <button class="load-more" onclick={onLoadMore} disabled={loadingMore}>
        {loadingMore ? 'Cargando…' : 'Cargar más'}
      </button>
    {/if}
  </Section>
{/if}

<style>
  .tx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4) 0;
  }
  .tx-header-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--foreground);
  }
  .see-all-btn {
    display: flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--primary);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
  }
  .see-all-btn:active { background: rgba(var(--surface-rgb), 1); }
  .tx-list { display: flex; flex-direction: column; }
  .load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-4);
    border: none;
    border-top: 1px solid rgba(var(--border-rgb), 0.3);
    background: transparent;
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }
  .load-more:active { background: rgba(var(--surface-rgb), 1); }
</style>
