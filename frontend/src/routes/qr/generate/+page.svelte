<script lang="ts">
  import api from '$lib/api';
  import Button from '$lib/components/Button.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import {
      CheckCircle,
      Clock,
      Download,
      InfoIcon,
      Loader,
      QrCode,
      RefreshCw,
      Share,
      X
  } from '@lucide/svelte';
  import * as htmlToImage from 'html-to-image';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  interface QrData {
    qrId: string;
    qrImage: string;
    transactionId: string;
    amount: number;
    currency: string;
    description: string;
    dueDate: string;
    singleUse: boolean;
    modifyAmount: boolean;
    status: string;
    // Campos adicionales para información del remitente (cuando se paga)
    senderName?: string;
    senderBank?: string;
    // Campos del pago exitoso
    paymentDate?: string;
    paymentAmount?: number;
    senderAccount?: string;
  }
  
  let amount = '';
  let description = '';
  let loading = false;
  let error = '';
  let qrData: QrData | null = null;
  let qrImageSrc = '';
  let currency = 'BOB';
  let amountInput: HTMLInputElement | undefined;
  let singleUse = true;
  let dueDate = new Date(Date.now() + 15*60*1000).toISOString().slice(0, 16); // 15 minutos por defecto

  // Computed property para modifyAmount basado en el monto
  $: modifyAmount = !amount || Number(amount) === 0;

  // Banco Economico hardcoded as the bank
  const BANCO_ECONOMICO_ID = 1;

  onMount(() => {
    amountInput?.focus();
  });

  async function generateQR() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      error = 'Por favor ingrese un monto válido';
      return;
    }

    loading = true;
    error = '';
    
    try {
      // Preparar datos según el formato esperado por la API
      const datos = {
        amount: Number(amount),
        description: description,
        bankId: BANCO_ECONOMICO_ID, // Banco Economico
        transactionId: `TX-${Date.now()}`,
        accountNumber: "12345678", // Este valor debería venir de la configuración de la empresa
        currency: currency,
        dueDate: new Date(dueDate).toISOString(), // Usar la fecha seleccionada
        singleUse: singleUse,
        modifyAmount: modifyAmount
      };
      
      const response = await api.generateQR(datos);

      if (!response.success) {
        throw new Error(response.message || 'Error al generar QR');
      }
      
      if (response.data) {
        // Guardar datos del QR en localStorage para la página de status
        const qrDataForStatus = {
          qrId: response.data.qrId,
          qrImage: response.data.qrImage,
          transactionId: response.data.transactionId,
          amount: response.data.amount,
          currency: response.data.currency,
          description: description.trim(),
          dueDate: response.data.dueDate,
          singleUse: response.data.singleUse,
          modifyAmount: response.data.modifyAmount,
          status: response.data.status
        };
        
        localStorage.setItem('qrDataForStatus', JSON.stringify(qrDataForStatus));
        
        // Redirigir a la página de estado para monitorear el pago
        goto(`/qr/status?id=${response.data.qrId}`);
      }
    } catch (err: any) {
      error = err.message || 'Error de conexión. Por favor intente nuevamente más tarde.';
    } finally {
      loading = false;
    }
  }

  function getCurrencySymbol(currency: string) {
    if (currency === 'BOB') return 'Bs.';
    if (currency === 'USD') return '$';
    return currency;
  }

  function formatAmount(amount: number | undefined) {
    if (typeof amount !== 'number') return '';
    return amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
</script>

<RouteLayout title="Generar Código QR">
    <div class="page-container">
      {#if error}
        <div class="alert-message error">
          <button class="close-button" on:click={() => error = ''}>
            <X size={16} />
          </button>
          <p>{error}</p>
        </div>
      {/if}
      
      <div class="qr-form">
        <div class="main-form">
          <div class="form-group">
            <label class="amount-label">Monto</label>
            <div class="amount-input-container">
              <input
                id="amount"
                type="number"
                bind:value={amount}
                placeholder="00.00"
                class="input-monto"
                required
              />
              <select class="currency-selector" bind:value={currency}>
                <option value="BOB">Bs.</option>
                <option value="USD">$</option>
              </select>
            </div>
            {#if !amount || Number(amount) === 0}
              <div class="amount-info">
                <InfoIcon size={14} />
                <span>Si el monto es cero, se podrá especificar la cantidad al momento de pagar</span>
              </div>
            {/if}
          </div>
          
          <div class="qr-options">
            <div class="option-group">
              <label class="option-label">Concepto</label>
              <input
                id="description"
                type="text"
                bind:value={description}
                placeholder="Ej. Pago por servicio de alojamiento"
                class="option-input"
              />
            </div>
            
            <div class="options-row">
              <div class="option-group">
                <label class="option-label">Uso único</label>
                <div class="toggle-input" class:active={singleUse} on:click={() => singleUse = !singleUse}>
                  <div class="toggle-handle-input"></div>
                </div>
              </div>
              
              <div class="option-group">
                <label class="option-label">Fecha de vencimiento</label>
                <div class="datetime-input-wrapper">
                  <input 
                    type="datetime-local" 
                    bind:value={dueDate}
                    class="datetime-input-custom"
                  />
                  <div class="datetime-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
          <Button 
            variant="primary" 
            icon={QrCode} 
            on:click={generateQR}
            loading={loading}
            disabled={loading || !amount}
            fullWidth
          >
            {loading ? 'Generando...' : 'Generar QR'}
          </Button>
        </div>
      </div>
    </div>
</RouteLayout>

<style>
  .page-container {
    width: 100%;
    min-height: 100%;
    display: grid;
  }
  .alert-message {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
    gap: 0.75rem;
    background: var(--error-bg);
    color: var(--error-color);
    border: 1px solid rgba(233, 58, 74, 0.2);
    box-shadow: 0 2px 8px rgba(233, 58, 74, 0.1);
  }
  
  .alert-message.error {
    background: var(--error-bg);
    color: var(--error-color);
    border-color: rgba(233, 58, 74, 0.2);
  }
  
  .alert-message p {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .qr-image {
    width: 300px;
    height: 300px;
    margin: 0 auto;
    display: block;
    border-radius: 0.75rem;
    object-fit: contain;
  }
  
  .qr-form {
    padding: var(--spacing-md);
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    gap: 1rem;
  }
  .main-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    overflow: auto;
  }
  
  @keyframes slideUpForm {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  .form-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .amount-label {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .amount-input-container {
    position: relative;
    width: 100%;
    max-width: 320px;
  }

  .amount-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-variant);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    max-width: 320px;
  }

  .amount-info :global(svg) {
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .concept-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .currency-selector {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    background: var(--surface-variant);
    color: var(--primary-color);
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    outline: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    transition: box-shadow 0.2s;
    min-width: 50px;
    z-index: 1;
  }

  .currency-selector:focus {
    box-shadow: 0 0 0 2px var(--primary-color);
  }
  .input-monto {
    width: 100%;
    font-size: 2rem;
    font-weight: 700;
    border: none;
    outline: none;
    background: none;
    padding: 0.5rem 3rem 0.5rem 0;
    color: var(--text-primary);
    box-shadow: none;
    border-radius: 0;
    text-align: center;
    transition: border-bottom 0.2s, color 0.2s;
    border-bottom: 2px solid transparent;
  }
  .input-monto:focus {
    border-bottom: 2px solid var(--primary-color);
    color: var(--primary-color);
  }
  .input-monto::placeholder {
    color: var(--text-secondary);
    opacity: 1;
    font-size: 2rem;
    font-weight: 400;
    text-align: center;
  }
  .input-descripcion {
    width: 100%;
    max-width: 320px;
    font-size: 0.9rem;
    border: none;
    outline: none;
    background: none;
    padding: 0.25rem 0;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
    box-shadow: none;
    border-radius: 0;
    text-align: center;
  }
  .input-descripcion::placeholder {
    color: var(--text-secondary);
    opacity: 0.8;
    font-size: 0.9rem;
    text-align: center;
  }

  .qr-options {
    width: 100%;
    max-width: 320px;
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .option-group {
    display: grid;
    height: 100%;
    grid-template-rows: 1fr auto;
    gap: 0.75rem;
  }

  .options-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .option-label {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--text-secondary);
    text-transform: none;
    letter-spacing: 0.02em;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .toggle-input {
    width: 44px;
    height: 24px;
    background: #e2e8f0;
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
    cursor: pointer;
    align-self: center;
  }

  .toggle-input.active {
    background: var(--primary-color);
  }

  .toggle-handle-input {
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toggle-input.active .toggle-handle-input {
    transform: translateX(20px);
  }

  .datetime-input {
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.5rem;
    font-size: 0.9rem;
    background: white;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s;
  }

  .datetime-input:focus {
    border-color: var(--primary-color);
  }

  .option-input {
    padding: 0.75rem 0;
    border: none;
    border-bottom: 1px solid var(--border-color);
    background: transparent;
    font-size: 0.9rem;
    color: var(--text-primary);
    outline: none;
    transition: border-bottom-color 0.2s;
    width: 100%;
  }

  .option-input:focus {
    border-color: var(--primary-color);
  }

  .option-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.8;
  }

  /* Custom DateTime Input */
  .datetime-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .datetime-input-custom {
    padding: 0.75rem 2.5rem 0.75rem 0;
    border: none;
    border-bottom: 1px solid var(--border-color);
    background: transparent;
    font-size: 0.9rem;
    color: var(--text-primary);
    outline: none;
    transition: border-bottom-color 0.2s;
    width: 100%;
  }

  .datetime-input-custom::-webkit-calendar-picker-indicator {
    display: none;
  }

  .datetime-input-custom:focus {
    border-color: var(--primary-color);
  }

  .datetime-input-custom::-webkit-calendar-picker-indicator {
    display: none;
  }

  .datetime-input-custom::-webkit-datetime-edit {
    color: var(--text-primary);
  }

  .datetime-input-custom::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }

  .datetime-icon {
    position: absolute;
    right: 0.75rem;
    color: var(--text-secondary);
    pointer-events: none;
  }
</style>
