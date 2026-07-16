<script lang="ts">
  import { Calendar, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import type { TransactionDay, TransactionMonth } from '$lib/api';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';

  let loading = true;
  let selectedPeriodType: 'weekly' | 'monthly' | 'yearly' = 'monthly';
  let selectedYear = new Date().getFullYear();
  let selectedMonth = new Date().getMonth();
  let selectedWeek = getCurrentWeek();
  let yearOptions = generateYearOptions();
  let showYearSelector = false;
  let monthlyData: TransactionDay[] = [];
  let weeklyData: TransactionDay[] = [];
  let yearlyData: TransactionMonth[] = [];
  let totalAmount = 0;

  function generateYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i < 5; i++) years.push(currentYear - i);
    return years;
  }

  function getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
  }

  function getMonthName(month: number): string {
    return ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month];
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function changePeriod(type: 'weekly' | 'monthly' | 'yearly'): void { selectedPeriodType = type; loadData(); }

  function navigatePeriod(direction: 'prev' | 'next'): void {
    if (selectedPeriodType === 'monthly') {
      if (direction === 'prev') { if (selectedMonth === 0) { selectedMonth = 11; selectedYear--; } else selectedMonth--; }
      else { if (selectedMonth === 11) { selectedMonth = 0; selectedYear++; } else selectedMonth++; }
    } else if (selectedPeriodType === 'weekly') {
      if (direction === 'prev') { if (selectedWeek === 1) { selectedWeek = 52; selectedYear--; } else selectedWeek--; }
      else { if (selectedWeek === 52) { selectedWeek = 1; selectedYear++; } else selectedWeek++; }
    } else direction === 'prev' ? selectedYear-- : selectedYear++;
    loadData();
  }

  function selectYear(year: number): void { selectedYear = year; showYearSelector = false; loadData(); }

  async function loadData(): Promise<void> {
    loading = true;
    try {
      if (selectedPeriodType === 'monthly') {
        const res: any = await api.getTransactionsByPeriod('monthly', selectedYear, selectedMonth);
        const payload = res.data || res;
        monthlyData = payload.data || payload;
        totalAmount = payload.summary?.total || 0;
      } else if (selectedPeriodType === 'weekly') {
        const res: any = await api.getTransactionsByPeriod('weekly', selectedYear, undefined, selectedWeek);
        const payload = res.data || res;
        weeklyData = payload.data || payload;
        totalAmount = payload.summary?.total || 0;
      } else {
        const res: any = await api.getTransactionsByPeriod('yearly', selectedYear);
        const payload = res.data || res;
        yearlyData = payload.data || payload;
        totalAmount = payload.summary?.total || 0;
      }
    } catch {} finally { loading = false; }
  }

  onMount(() => loadData());
</script>

<PageLayout title="Resumen">
  <div class="period-type-selector">
    <button class="period-btn" class:active={selectedPeriodType === 'weekly'} onclick={() => changePeriod('weekly')}><Clock size={16} /><span>Semanal</span></button>
    <button class="period-btn" class:active={selectedPeriodType === 'monthly'} onclick={() => changePeriod('monthly')}><Calendar size={16} /><span>Mensual</span></button>
    <button class="period-btn" class:active={selectedPeriodType === 'yearly'} onclick={() => changePeriod('yearly')}><CalendarDays size={16} /><span>Anual</span></button>
  </div>

  <div class="period-navigator">
    <button class="nav-btn" onclick={() => navigatePeriod('prev')}><ChevronLeft size={18} /></button>
    <div class="current-period">
      <button class="year-selector" onclick={() => showYearSelector = !showYearSelector}>
        {selectedPeriodType === 'monthly' ? `${getMonthName(selectedMonth)} ${selectedYear}` : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}, ${selectedYear}` : `${selectedYear}`}
        <ChevronDown size={14} />
      </button>
      {#if showYearSelector}
        <div class="year-dropdown">
          {#each yearOptions as year}
            <button class="year-option" class:selected={year === selectedYear} onclick={() => selectYear(year)}>{year}</button>
          {/each}
        </div>
      {/if}
    </div>
    <button class="nav-btn" onclick={() => navigatePeriod('next')}><ChevronRight size={18} /></button>
  </div>

  <div class="summary-card">
    <div class="summary-title">Total Recaudado</div>
    <div class="summary-amount">USD {formatCurrency(totalAmount)}</div>
    <div class="summary-period">
      {selectedPeriodType === 'monthly' ? `${getMonthName(selectedMonth)} ${selectedYear}` : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}, ${selectedYear}` : `Año ${selectedYear}`}
    </div>
  </div>

  {#if loading}
    <Skeleton width="100%" height="80px" radius="md" count={3} gap="space-2" />
  {:else if (selectedPeriodType === 'monthly' && monthlyData.length > 0) || (selectedPeriodType === 'weekly' && weeklyData.length > 0) || (selectedPeriodType === 'yearly' && yearlyData.length > 0)}
    <div class="data-grid">
      {#if selectedPeriodType === 'monthly'}
        {#each monthlyData as day}
          <div class="data-card"><div class="date-day">{day.formatted.day}<span class="date-month">{day.formatted.month}</span></div><div class="data-amount">{day.formatted.amount}</div><div class="data-count">{day.count} transacciones</div></div>
        {/each}
      {:else if selectedPeriodType === 'weekly'}
        {#each weeklyData as day}
          <div class="data-card"><div class="date-day">{day.formatted.day}<span class="date-month">{day.formatted.month}</span></div><div class="data-amount">{day.formatted.amount}</div><div class="data-count">{day.count} transacciones</div></div>
        {/each}
      {:else}
        {#each yearlyData as month}
          <div class="data-card"><div class="data-month">{month.formatted.month}</div><div class="data-amount">{month.formatted.amount}</div><div class="data-count">{month.count} transacciones</div></div>
        {/each}
      {/if}
    </div>
  {:else}
    <EmptyState icon={Calendar} title="No hay datos disponibles" message="No se encontraron recaudaciones para el período seleccionado." />
  {/if}
</PageLayout>

<style>
  .period-type-selector { display: flex; gap: var(--space-2); background: rgba(var(--surface-rgb), 0.5); border-radius: var(--radius-lg); padding: var(--space-1); }
  .period-btn { display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: none; border: none; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); font-weight: 500; flex: 1; cursor: pointer; }
  .period-btn.active { background: rgba(var(--surface-rgb), 1); color: var(--primary); }
  .period-navigator { display: flex; align-items: center; justify-content: space-between; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3); }
  .nav-btn { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: var(--radius-md); background: none; border: none; color: rgba(var(--text-secondary-rgb), 1); cursor: pointer; }
  .nav-btn:active { background: rgba(var(--surface-rgb), 1); color: var(--primary); }
  .current-period { font-weight: 600; color: rgba(var(--text-primary-rgb), 1); position: relative; }
  .year-selector { display: flex; align-items: center; gap: var(--space-2); background: none; border: none; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); font-weight: 600; cursor: pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); }
  .year-selector:active { background: rgba(var(--surface-rgb), 0.5); }
  .year-dropdown { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: var(--space-2); z-index: 10; margin-top: var(--space-2); min-width: 100px; }
  .year-option { display: block; width: 100%; text-align: center; padding: var(--space-2); border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); }
  .year-option:active { background: rgba(var(--surface-rgb), 0.5); }
  .year-option.selected { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-weight: 600; }
  .summary-card { background: var(--primary); border-radius: var(--radius-xl); padding: var(--space-6); text-align: center; }
  .summary-title { font-size: var(--text-sm); opacity: 0.9; margin-bottom: var(--space-2); color: rgba(var(--bg-rgb), 1); }
  .summary-amount { font-size: 2rem; font-weight: 700; margin-bottom: var(--space-2); letter-spacing: -0.025em; color: rgba(var(--bg-rgb), 1); }
  .summary-period { font-size: var(--text-sm); opacity: 0.8; color: rgba(var(--bg-rgb), 1); }
  .data-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--space-2); }
  .data-card { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-3); border: 1px solid rgba(var(--border-rgb), 0.3); display: flex; flex-direction: column; align-items: center; text-align: center; }
  .data-card:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .date-day { font-size: 1.25rem; font-weight: 700; color: rgba(var(--text-primary-rgb), 1); }
  .date-month { font-size: 0.7rem; color: rgba(var(--text-secondary-rgb), 1); text-transform: uppercase; letter-spacing: 0.05em; display: block; }
  .data-month { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); margin-bottom: var(--space-1); }
  .data-amount { font-size: var(--text-base); font-weight: 700; color: var(--primary); margin-bottom: var(--space-1); }
  .data-count { font-size: 0.75rem; color: rgba(var(--text-secondary-rgb), 1); }
</style>
