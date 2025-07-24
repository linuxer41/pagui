<script lang="ts">
  import TransactionItem from './TransactionItem.svelte';
  import { CalendarDays, CalendarRange, Calendar } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { Transaction } from '$lib/api';
  
  export let transactions: Transaction[] = [];
  export let currency = 'USD';
  
  // Filter states
  let selectedStatus = 'all';
  let selectedTimeFilter = 'all';
  
  // Status options
  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'completed', label: 'Completados' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'canceled', label: 'Cancelados' }
  ];
  
  // Time filter options
  const timeFilterOptions = [
    { value: 'all', label: 'Todo', icon: CalendarRange },
    { value: 'today', label: 'Hoy', icon: Calendar },
    { value: 'month', label: 'Este mes', icon: CalendarDays }
  ];
  
  // Filtered transactions based on selected filters
  $: filteredTransactions = transactions.filter(tx => {
    // Apply status filter
    if (selectedStatus !== 'all' && tx.status !== selectedStatus) {
      return false;
    }
    
    // Apply time filter
    if (selectedTimeFilter !== 'all') {
      const txDate = new Date(tx.date);
      const today = new Date();
      
      if (selectedTimeFilter === 'today') {
        // Filter for today's transactions
        if (txDate.toDateString() !== today.toDateString()) {
          return false;
        }
      } else if (selectedTimeFilter === 'month') {
        // Filter for this month's transactions
        if (txDate.getMonth() !== today.getMonth() || 
            txDate.getFullYear() !== today.getFullYear()) {
          return false;
        }
      }
    }
    
    return true;
  });
</script>

<div class="transaction-list-container">
  <!-- Filter tabs section -->
  <div class="filter-section">
    <!-- Status filters -->
    <div class="filter-tabs status-tabs">
      {#each statusOptions as option}
        <button 
          class="filter-tab {selectedStatus === option.value ? 'active' : ''}" 
          on:click={() => selectedStatus = option.value}
          in:fly={{ y: -20, duration: 400, delay: 100 }}
        >
          {option.label}
        </button>
      {/each}
    </div>
    
    <!-- Time period filters -->
    <div class="filter-tabs time-tabs">
      {#each timeFilterOptions as option}
        <button 
          class="filter-tab time-tab {selectedTimeFilter === option.value ? 'active' : ''}" 
          on:click={() => selectedTimeFilter = option.value}
          in:fly={{ y: -20, duration: 400, delay: 200 }}
        >
          <svelte:component this={option.icon} size={14} />
          {option.label}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Transactions list -->
  <div class="transactions-list">
    {#if filteredTransactions.length === 0}
      <div class="empty-state" in:fade={{ duration: 300 }}>
        <p>No hay transacciones que coincidan con los filtros seleccionados.</p>
      </div>
    {:else}
      {#each filteredTransactions as tx, i (tx.id)}
        <div in:fly={{ y: 20, duration: 400, delay: 100 + i * 50 }}>
          <TransactionItem transaction={tx} {currency} />
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .transaction-list-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .filter-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: nowrap;
    padding: 0.25rem;
    overflow-x: auto;
    white-space: nowrap;
  }
  
  
  .filter-tab {
    padding: 0.5rem 0.75rem;
    border-radius: 1.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    box-shadow: var(--card-shadow-sm);
    flex-shrink: 0; /* Evitar que los tabs se compriman */
  }
  
  .filter-tab:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .filter-tab.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .time-tab {
    font-size: 0.8rem;
    padding: 0.4rem 0.65rem;
  }
  
  .transactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 2rem 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    background: var(--surface);
    border-radius: 0.75rem;
    border: 1px dashed var(--border-color);
  }
</style> 