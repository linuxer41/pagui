<script lang="ts">
  import ProfilePage from '$lib/components/layouts/ProfilePage.svelte';
  import {
    Calendar,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock
  } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { tweened } from 'svelte/motion';
  import { fade, fly, scale } from 'svelte/transition';
  import api from '$lib/api';
  import type { TransactionDay, TransactionMonth, TransactionsResponse } from '$lib/api';

  // Estados para filtrado y visualización
  let loading = true;
  let selectedPeriodType: 'weekly' | 'monthly' | 'yearly' = 'monthly'; 
  let selectedYear = new Date().getFullYear();
  let selectedMonth = new Date().getMonth();
  let selectedWeek = getCurrentWeek();
  let yearOptions = generateYearOptions();
  let showYearSelector = false;
  
  // Datos
  let monthlyData: TransactionDay[] = [];
  let weeklyData: TransactionDay[] = [];
  let yearlyData: TransactionMonth[] = [];
  
  // Datos animados para los totales
  let totalAmount = tweened(0, { duration: 800, easing: cubicOut });
  
  // Generar opciones de años (últimos 5 años)
  function generateYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }
  
  // Obtener la semana actual (1-52)
  function getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
  }
  
  // Obtener nombres de los meses
  function getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month];
  }
  
  // Formatear montos con separador de miles y decimales
  function formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Cambiar el periodo seleccionado
  function changePeriod(type: 'weekly' | 'monthly' | 'yearly'): void {
    selectedPeriodType = type;
    loadData();
  }
  
  // Navegación entre periodos
  function navigatePeriod(direction: 'prev' | 'next'): void {
    if (selectedPeriodType === 'monthly') {
      if (direction === 'prev') {
        if (selectedMonth === 0) {
          selectedMonth = 11;
          selectedYear--;
        } else {
          selectedMonth--;
        }
      } else {
        if (selectedMonth === 11) {
          selectedMonth = 0;
          selectedYear++;
        } else {
          selectedMonth++;
        }
      }
    } else if (selectedPeriodType === 'weekly') {
      if (direction === 'prev') {
        if (selectedWeek === 1) {
          selectedWeek = 52;
          selectedYear--;
        } else {
          selectedWeek--;
        }
      } else {
        if (selectedWeek === 52) {
          selectedWeek = 1;
          selectedYear++;
        } else {
          selectedWeek++;
        }
      }
    } else {
      // Yearly navigation
      direction === 'prev' ? selectedYear-- : selectedYear++;
    }
    
    loadData();
  }
  
  // Cambiar el año seleccionado
  function selectYear(year: number): void {
    selectedYear = year;
    showYearSelector = false;
    loadData();
  }

  // Cargar datos según el periodo seleccionado
  async function loadData(): Promise<void> {
    loading = true;
    
    try {
      let response: TransactionsResponse;
      
      // Usar la nueva API para obtener los datos según el período
      if (selectedPeriodType === 'monthly') {
        response = await api.getTransactionsByPeriod(
          'monthly', 
          selectedYear, 
          selectedMonth
        );
        
        // Convertir los datos recibidos al tipo correcto
        monthlyData = response.data as TransactionDay[];
        
      } else if (selectedPeriodType === 'weekly') {
        response = await api.getTransactionsByPeriod(
          'weekly', 
          selectedYear, 
          undefined, 
          selectedWeek
        );
        
        // Convertir los datos recibidos al tipo correcto
        weeklyData = response.data as TransactionDay[];
        
      } else {
        response = await api.getTransactionsByPeriod(
          'yearly', 
          selectedYear
        );
        
        // Convertir los datos recibidos al tipo correcto
        yearlyData = response.data as TransactionMonth[];
      }
      
      // Actualizar el total para la animación
      totalAmount.set(response.summary.total);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      loading = false;
    }
  }
  
  // Cargar datos iniciales
  onMount(() => {
    loadData();
  });
</script>

<ProfilePage title="Detalle de Recaudaciones">
  <div slot="sub-header">
    <div class="transactions-header" in:fly={{ y: -30, duration: 400 }}>
      <div class="period-selector-container" in:fade={{ duration: 400, delay: 100 }}>
        <div class="period-type-selector">
          <button 
            class="period-btn {selectedPeriodType === 'weekly' ? 'active' : ''}" 
            on:click={() => changePeriod('weekly')}
          >
            <Clock size={16} />
            <span>Semanal</span>
          </button>
          <button 
            class="period-btn {selectedPeriodType === 'monthly' ? 'active' : ''}" 
            on:click={() => changePeriod('monthly')}
          >
            <Calendar size={16} />
            <span>Mensual</span>
          </button>
          <button 
            class="period-btn {selectedPeriodType === 'yearly' ? 'active' : ''}" 
            on:click={() => changePeriod('yearly')}
          >
            <CalendarDays size={16} />
            <span>Anual</span>
          </button>
        </div>
        
        <div class="period-navigator">
          <button class="nav-btn" on:click={() => navigatePeriod('prev')}>
            <ChevronLeft size={18} />
          </button>
          <div class="current-period">
            {#if selectedPeriodType === 'monthly'}
              <button class="year-selector" on:click={() => showYearSelector = !showYearSelector}>
                {getMonthName(selectedMonth)} {selectedYear}
                <ChevronDown size={14} />
              </button>
            {:else if selectedPeriodType === 'weekly'}
              <button class="year-selector" on:click={() => showYearSelector = !showYearSelector}>
                Semana {selectedWeek}, {selectedYear}
                <ChevronDown size={14} />
              </button>
            {:else}
              <button class="year-selector" on:click={() => showYearSelector = !showYearSelector}>
                {selectedYear}
                <ChevronDown size={14} />
              </button>
            {/if}
            
            {#if showYearSelector}
              <div class="year-dropdown" in:scale={{ duration: 200, start: 0.95 }}>
                {#each yearOptions as year}
                  <button 
                    class="year-option {year === selectedYear ? 'selected' : ''}" 
                    on:click={() => selectYear(year)}
                  >
                    {year}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <button class="nav-btn" on:click={() => navigatePeriod('next')}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <div class="summary-card" in:scale={{ duration: 400, delay: 100, start: 0.95 }}>
    <div class="summary-title">Total Recaudado</div>
    <div class="summary-amount">USD {$totalAmount ? formatCurrency($totalAmount) : '0.00'}</div>
    <div class="summary-period">
      {#if selectedPeriodType === 'monthly'}
        {getMonthName(selectedMonth)} {selectedYear}
      {:else if selectedPeriodType === 'weekly'}
        Semana {selectedWeek}, {selectedYear}
      {:else}
        Año {selectedYear}
      {/if}
    </div>
  </div>
  
  <!-- Visualización de datos según el periodo seleccionado -->
  {#if loading}
    <div class="loading-container" in:fade={{ duration: 200 }}>
      <div class="loading-spinner"></div>
      <p>Cargando datos...</p>
    </div>
  {:else}
    <!-- Visualización Mensual -->
    {#if selectedPeriodType === 'monthly' && monthlyData.length > 0}
      <div class="data-grid daily-grid" in:fade={{ duration: 400 }}>
        {#each monthlyData as day, i}
          <div class="data-card" in:fly={{ y: 20, duration: 400, delay: 50 + i * 30 }}>
            <div class="data-date">
              <span class="date-day">{day.formatted.day}</span>
              <span class="date-month">{day.formatted.month}</span>
            </div>
            <div class="data-amount">{day.formatted.amount}</div>
            <div class="data-count">{day.count} transacciones</div>
          </div>
        {/each}
      </div>
    <!-- Visualización Semanal -->
    {:else if selectedPeriodType === 'weekly' && weeklyData.length > 0}
      <div class="data-grid daily-grid" in:fade={{ duration: 400 }}>
        {#each weeklyData as day, i}
          <div class="data-card" in:fly={{ y: 20, duration: 400, delay: 50 + i * 30 }}>
            <div class="data-date">
              <span class="date-day">{day.formatted.day}</span>
              <span class="date-month">{day.formatted.month}</span>
            </div>
            <div class="data-amount">{day.formatted.amount}</div>
            <div class="data-count">{day.count} transacciones</div>
          </div>
        {/each}
      </div>
    <!-- Visualización Anual -->
    {:else if selectedPeriodType === 'yearly' && yearlyData.length > 0}
      <div class="data-grid monthly-grid" in:fade={{ duration: 400 }}>
        {#each yearlyData as month, i}
          <div class="data-card" in:fly={{ y: 20, duration: 400, delay: 50 + i * 30 }}>
            <div class="data-month">{month.formatted.month}</div>
            <div class="data-amount">{month.formatted.amount}</div>
            <div class="data-count">{month.count} transacciones</div>
          </div>
        {/each}
      </div>
    <!-- Sin datos -->
    {:else}
      <div class="empty-state" in:fade={{ duration: 400 }}>
        <div class="empty-icon">
          <Calendar size={48} />
        </div>
        <h3>No hay datos disponibles</h3>
        <p>No se encontraron recaudaciones para el período seleccionado.</p>
      </div>
    {/if}
  {/if}
</ProfilePage>

<style>
  .transactions-header {
    padding-top: 1rem;
  }
  
  .period-selector-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .period-type-selector {
    display: flex;
    gap: 0.5rem;
    background: var(--surface-variant);
    border-radius: 0.75rem;
    padding: 0.25rem;
  }
  
  .period-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    flex: 1;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .period-btn.active {
    background: var(--surface);
    color: var(--primary-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .period-navigator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
    border-radius: 0.75rem;
    padding: 0.5rem 0.75rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .nav-btn:hover {
    background: var(--surface-variant);
    color: var(--primary-color);
  }
  
  .current-period {
    font-weight: 600;
    color: var(--text-primary);
    position: relative;
  }
  
  .year-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }
  
  .year-selector:hover {
    background: var(--surface-variant);
  }
  
  .year-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    border-radius: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
    z-index: 10;
    margin-top: 0.5rem;
  }
  
  .year-option {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.75rem;
    border: none;
    background: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .year-option:hover {
    background: var(--surface-variant);
  }
  
  .year-option.selected {
    background: rgba(var(--primary-rgb), 0.1);
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .summary-card {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    color: white;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
    text-align: center;
  }
  
  .summary-title {
    font-size: 1rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
  }
  
  .summary-amount {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    letter-spacing: -0.025em;
  }
  
  .summary-period {
    font-size: 0.875rem;
    opacity: 0.8;
  }
  
  .data-grid {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .daily-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
  
  .monthly-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .data-card {
    background: var(--surface);
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .data-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
    border-color: var(--primary-color);
  }
  
  .data-date {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.25rem;
  }
  
  .date-day {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .date-month {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .data-month {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }
  
  .data-amount {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.25rem;
  }
  
  .data-count {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 0;
    gap: 1rem;
    color: var(--text-secondary);
  }
  
  .loading-spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid rgba(var(--primary-rgb), 0.2);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 0;
    gap: 1rem;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .empty-icon {
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: var(--surface-variant);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    color: var(--primary-color);
    opacity: 0.7;
  }
  
  .empty-state h3 {
    font-size: 1.25rem;
    color: var(--text-primary);
    margin: 0;
  }
  
  .empty-state p {
    max-width: 350px;
    margin: 0;
    font-size: 0.925rem;
  }
  
  @media (max-width: 768px) {
    .period-selector-container {
      flex-direction: column;
    }
  }
</style> 