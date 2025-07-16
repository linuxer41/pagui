<script lang="ts">
  import { ArrowDownLeft, ArrowUpRight } from '@lucide/svelte';
  import { scale } from 'svelte/transition';
  import type { Transaction } from '$lib/api';
  import Modal from './Modal.svelte';
  import TransactionDetails from './TransactionDetails.svelte';
  
  export let transaction: Transaction;
  export let currency = 'USD';

  // Estado del modal
  let showModal = false;

  // Formatear fecha para mostrar de forma amigable
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Hoy, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Ayer, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
  
  // Get transaction name (from or to depending on type)
  $: transactionName = transaction.type === 'incoming' 
    ? (transaction.from || 'Ingreso') 
    : (transaction.to || 'Pago');
  
  // Abrir modal al hacer clic
  function handleClick() {
    showModal = true;
  }
  
  // Cerrar modal
  function closeModal() {
    showModal = false;
  }
</script>

<div class="transaction-item" on:click={handleClick} role="button" tabindex="0">
  <div class="transaction-icon {transaction.type === 'incoming' ? 'incoming' : 'outgoing'}">
    {#if transaction.type === 'incoming'}
      <ArrowDownLeft size={18} />
    {:else}
      <ArrowUpRight size={18} />
    {/if}
  </div>
  <div class="transaction-details">
    <div class="transaction-title">{transactionName}</div>
    <div class="transaction-date">{formatDate(transaction.date)}</div>
  </div>
  <div class="transaction-info">
    <div class="transaction-amount {transaction.type === 'incoming' ? 'income' : 'expense'}">
      {transaction.type === 'incoming' ? '+' : '-'} {currency} <span in:scale={{ duration: 500 }}>{formatCurrency(transaction.amount)}</span>
    </div>
    <div class="transaction-status status-{statusColorMap[transaction.status] || 'default'}">{transaction.status}</div>
  </div>
</div>

<!-- Modal para detalles de transacción -->
<Modal 
  open={showModal} 
  title="Detalles de transacción" 
  on:close={closeModal}
  maxWidth="550px"
>
  <TransactionDetails {transaction} {currency} />
</Modal>

<style>
  .transaction-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border-radius: 0.75rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    cursor: pointer;
  }
  
  .transaction-item:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
  }
  
  /* Accesibilidad para foco con teclado */
  .transaction-item:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary-color);
  }
  
  /* Resto de estilos igual que antes */
  .transaction-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
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
  
  .transaction-details {
    flex: 1;
    min-width: 0;
  }
  
  .transaction-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .transaction-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .transaction-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }
  
  .transaction-amount {
    font-weight: 600;
    font-size: 0.875rem;
    white-space: nowrap;
  }
  
  .transaction-amount.income {
    color: var(--success-color);
  }
  
  .transaction-amount.expense {
    color: var(--error-color);
  }

  .transaction-status {
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
    padding: 0.15rem 0.5rem;
    border-radius: 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary);
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
</style> 