<script lang="ts">
  import type { Transaction } from '$lib/api';
  import { ArrowDownLeft, ArrowUpRight, CalendarDays, Clock, Tag, FileText } from '@lucide/svelte';
  import { scale } from 'svelte/transition';

  export let transaction: Transaction;
  export let currency = 'USD';

  // Formatear fecha completa
  function formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('es-ES', options);
  }
  
  // Formatear montos con separador de miles y decimales
  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Status badge color mapping
  const statusColorMap: Record<string, string> = {
    'completed': 'success',
    'pending': 'warning',
    'cancelled': 'error',
    'canceled': 'error'
  };
  
  // Status mapping para texto en español
  const statusTextMap: Record<string, string> = {
    'completed': 'Completado',
    'pending': 'Pendiente',
    'canceled': 'Cancelado',
    'cancelled': 'Cancelado'
  };
  
  // Get transaction name (from or to depending on type)
  $: transactionName = transaction.type === 'incoming' 
    ? (transaction.from || 'Ingreso') 
    : (transaction.to || 'Pago');
</script>

<div class="transaction-details" in:fade={{ duration: 200 }}>
  <div class="transaction-header">
    <div class="transaction-icon {transaction.type === 'incoming' ? 'incoming' : 'outgoing'}">
      {#if transaction.type === 'incoming'}
        <ArrowDownLeft size={24} />
      {:else}
        <ArrowUpRight size={24} />
      {/if}
    </div>
    
    <div class="transaction-amount-info">
      <h3 class="transaction-amount {transaction.type === 'incoming' ? 'income' : 'expense'}">
        {transaction.type === 'incoming' ? '+' : '-'} {currency} <span in:scale={{ duration: 500 }}>{formatCurrency(transaction.amount)}</span>
      </h3>
      <div class="transaction-status status-{statusColorMap[transaction.status] || 'default'}">
        {statusTextMap[transaction.status] || transaction.status}
      </div>
    </div>
  </div>
  
  <div class="transaction-body">
    <div class="detail-row">
      <div class="detail-label">
        <span class="detail-icon">{transaction.type === 'incoming' ? 'De' : 'A'}</span>
      </div>
      <div class="detail-value highlight">{transactionName}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">
        <span class="detail-icon"><CalendarDays size={16} /></span>
        Fecha
      </div>
      <div class="detail-value">{formatFullDate(transaction.date)}</div>
    </div>
    
    {#if transaction.reference}
      <div class="detail-row">
        <div class="detail-label">
          <span class="detail-icon"><FileText size={16} /></span>
          Referencia
        </div>
        <div class="detail-value">{transaction.reference}</div>
      </div>
    {/if}
    
    {#if transaction.category}
      <div class="detail-row">
        <div class="detail-label">
          <span class="detail-icon"><Tag size={16} /></span>
          Categoría
        </div>
        <div class="detail-value">
          <div class="category-tag">{transaction.category}</div>
        </div>
      </div>
    {/if}
    
    {#if transaction.metadata && Object.keys(transaction.metadata).length > 0}
      <div class="metadata-section">
        <h4>Información adicional</h4>
        <div class="metadata-list">
          {#each Object.entries(transaction.metadata) as [key, value]}
            <div class="detail-row">
              <div class="detail-label">{key}</div>
              <div class="detail-value">{value}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .transaction-details {
    width: 100%;
  }

  .transaction-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .transaction-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .transaction-icon.incoming {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }
  
  .transaction-icon.outgoing {
    background: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
  }
  
  .transaction-amount-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .transaction-amount {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  
  .transaction-amount.income {
    color: var(--success-color);
  }
  
  .transaction-amount.expense {
    color: var(--error-color);
  }
  
  .transaction-status {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary);
    align-self: flex-start;
    text-transform: uppercase;
  }
  
  .status-success {
    background-color: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }
  
  .status-warning {
    background-color: rgba(255, 175, 0, 0.1);
    color: #ff9800;
  }
  
  .status-error {
    background-color: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
  }
  
  .status-default {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary);
  }
  
  .transaction-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .detail-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .detail-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }
  
  .detail-value {
    font-size: 1rem;
    color: var(--text-primary);
    word-break: break-word;
  }
  
  .detail-value.highlight {
    font-weight: 600;
    font-size: 1.125rem;
  }
  
  .category-tag {
    background-color: var(--surface-hover);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.85rem;
    display: inline-block;
    text-transform: capitalize;
  }
  
  .metadata-section {
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--border-color);
  }
  
  .metadata-section h4 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .metadata-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  @media (min-width: 640px) {
    .detail-row {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    
    .detail-label {
      width: 150px;
      flex-shrink: 0;
    }
    
    .detail-value {
      flex: 1;
    }
  }
</style> 