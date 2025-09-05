<script lang="ts">
  import { CreditCardIcon } from 'svelte-feather-icons';
  import DeudaCard from './DeudaCard.svelte';
  import type { QRGenerationData } from '$lib/types/api';
  
  // Interfaces
  interface Deuda {
    id?: string | number;
    cuf?: string;
    monto: number;
    descripcion: string;
    fecha: string | Date;
    estado: string;
    numeroCuenta?: string | number;
    volumenConsumo?: number;
    tipo?: 'agua' | 'servicio';
    nombreCliente?: string;
    idServicio?: number;
  }
  
  // Props
  export let deudas: Deuda[] = [];
  export let isGeneratingQR: boolean = false;
  export let isLoading: boolean = false;
  export let qrGenerado: QRGenerationData | null = null;
  export let error: string | null = null;
  
  // Funciones que se propagarán desde el padre
  export let generarQR: (deuda: Deuda) => void = () => {};
  export let pagarServicios: (deudas: Deuda[], total: number) => void = () => {};
  
  // Calcular si hay servicios para mostrar el botón de pagar todos
  $: tieneServicios = deudas && deudas.length > 0 && deudas.some(d => d.tipo === 'servicio');
  
  // Calcular el total de servicios
  $: totalServicios = tieneServicios 
    ? deudas.filter(d => d.tipo === 'servicio').reduce((sum, d) => sum + d.monto, 0)
    : 0;
</script>

<div class="debt-list">
  <h3>Detalle de Deudas</h3>
  
  <!-- Botón para pagar todos los servicios de una vez -->
  {#if tieneServicios}
    <div class="bulk-actions">
      <button 
        class="btn-pay-all" 
        on:click={() => pagarServicios(
          deudas.filter(d => d.tipo === 'servicio'), 
          totalServicios
        )} 
        disabled={isLoading}
      >
        {#if isLoading}
          <span class="spinner"></span>
          Procesando...
        {:else}
          <CreditCardIcon size="16" />
          Pagar Todos los Servicios (Bs. {totalServicios.toFixed(2)})
        {/if}
      </button>
    </div>
  {/if}
  
  <!-- Lista de deudas -->
  {#if deudas && deudas.length > 0}
    {#each deudas as deuda, index (deuda.id || index)}
      <DeudaCard
        {deuda}
        {index}
        {isGeneratingQR}
        {isLoading}
        {qrGenerado}
        {error}
        {deudas}
        {generarQR}
        {pagarServicios}
        permitirPagar={deuda.tipo === 'servicio' || index === 0 || deudas.filter(d => d.tipo === 'agua').findIndex(d => d.id === deuda.id) === 0}
      />
    {/each}
  {:else}
    <div class="no-debts">
      <p>No hay deudas para mostrar</p>
    </div>
  {/if}
</div>

<style>
  .debt-list {
    margin-top: 1rem;
    text-align: left;
  }
  
  .debt-list h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgb(var(--text-primary));
    margin-bottom: 0.75rem;
    text-align: center;
  }
  
  .bulk-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }
  
  .btn-pay-all {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    justify-content: center;
    background: var(--gradient-primary);
    color: rgb(var(--white));
    box-shadow: var(--shadow);
  }
  
  .btn-pay-all:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
  
  .no-debts {
    background: var(--background-secondary);
    padding: 2rem;
    border-radius: var(--radius);
    text-align: center;
    border: 1px dashed var(--border-color);
    color: var(--text-secondary);
    font-style: italic;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--gray-200), 0.3);
    border-top: 2px solid rgb(var(--primary));
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
