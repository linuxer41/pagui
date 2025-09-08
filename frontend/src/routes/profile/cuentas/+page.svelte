<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { 
    ArrowLeft,
    CreditCard,
    DollarSign,
    Building2,
    User,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff
  } from '@lucide/svelte';

  let showBalances = true;

  // Función para formatear moneda
  function formatCurrency(amount: string, currency: string): string {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(numAmount);
  }

  // Función para obtener el tipo de cuenta en español
  function getAccountTypeLabel(type: string): string {
    switch (type) {
      case 'business':
        return 'Empresarial';
      case 'personal':
        return 'Personal';
      default:
        return type;
    }
  }

  // Función para obtener el estado en español
  function getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'suspended':
        return 'Suspendida';
      default:
        return status;
    }
  }

  // Función para obtener el rol del usuario en español
  function getUserRoleLabel(role: string): string {
    switch (role) {
      case 'owner':
        return 'Propietario';
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      default:
        return role;
    }
  }

  function toggleBalanceVisibility() {
    showBalances = !showBalances;
  }
</script>

<RouteLayout title="Mis Cuentas">
  <div class="accounts-container">
    <!-- Header con información del usuario -->
    <div class="user-header">
      <div class="user-info">
        <h2>{$auth.user?.fullName || 'Usuario'}</h2>
        <p class="user-role">{$auth.user?.roleName || 'Usuario'}</p>
      </div>
      <div class="balance-toggle">
        <button 
          class="toggle-button" 
          on:click={toggleBalanceVisibility}
          aria-label={showBalances ? 'Ocultar saldos' : 'Mostrar saldos'}
        >
          {#if showBalances}
            <EyeOff size={20} />
          {:else}
            <Eye size={20} />
          {/if}
        </button>
      </div>
    </div>

    <!-- Lista de cuentas -->
    <div class="accounts-list">
      {#if $auth.accounts && $auth.accounts.length > 0}
        {#each $auth.accounts as account (account.id)}
          <div class="account-card" class:primary={account.isPrimary}>
            <div class="account-header">
              <div class="account-info">
                <div class="account-type">
                  {#if account.accountType === 'business'}
                    <Building2 size={20} />
                  {:else}
                    <User size={20} />
                  {/if}
                  <span>{getAccountTypeLabel(account.accountType)}</span>
                </div>
                <div class="account-number">
                  {account.accountNumber}
                </div>
              </div>
              <div class="account-status">
                {#if account.status === 'active'}
                  <CheckCircle size={16} class="status-active" />
                {:else}
                  <AlertCircle size={16} class="status-inactive" />
                {/if}
                <span>{getStatusLabel(account.status)}</span>
              </div>
            </div>

            <div class="account-details">
              <div class="balance-section">
                <div class="balance-item">
                  <span class="balance-label">Saldo Total</span>
                  <span class="balance-value">
                    {#if showBalances}
                      {formatCurrency(account.balance, account.currency)}
                    {:else}
                      ••••••
                    {/if}
                  </span>
                </div>
                <div class="balance-item">
                  <span class="balance-label">Saldo Disponible</span>
                  <span class="balance-value available">
                    {#if showBalances}
                      {formatCurrency(account.availableBalance, account.currency)}
                    {:else}
                      ••••••
                    {/if}
                  </span>
                </div>
              </div>

              <div class="account-meta">
                <div class="meta-item">
                  <span class="meta-label">Moneda</span>
                  <span class="meta-value">{account.currency}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Rol</span>
                  <span class="meta-value">{getUserRoleLabel(account.userRole)}</span>
                </div>
                {#if account.isPrimary}
                  <div class="primary-badge">
                    <CheckCircle size={14} />
                    <span>Cuenta Principal</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="no-accounts">
          <CreditCard size={48} />
          <h3>No tienes cuentas</h3>
          <p>No se encontraron cuentas asociadas a tu usuario.</p>
        </div>
      {/if}
    </div>

    <!-- Información adicional -->
    <div class="accounts-info">
      <div class="info-card">
        <h4>Información sobre tus cuentas</h4>
        <ul>
          <li>Tu cuenta principal es la que se usa por defecto para las transacciones</li>
          <li>El saldo disponible es el dinero que puedes usar inmediatamente</li>
          <li>Puedes ocultar/mostrar los saldos tocando el ícono del ojo</li>
        </ul>
      </div>
    </div>
  </div>
</RouteLayout>

<style>
  .accounts-container {
    padding: 1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--card-background);
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }

  .user-info h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .user-role {
    margin: 0.25rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-transform: capitalize;
  }

  .balance-toggle {
    display: flex;
    align-items: center;
  }

  .toggle-button {
    background: var(--button-secondary-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    background: var(--button-secondary-hover);
    color: var(--text-primary);
  }

  .accounts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .account-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }

  .account-card.primary {
    border-color: var(--primary-color);
    background: linear-gradient(135deg, var(--card-background) 0%, rgba(var(--primary-color-rgb), 0.05) 100%);
  }

  .account-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .account-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .account-info {
    flex: 1;
  }

  .account-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .account-number {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-family: monospace;
  }

  .account-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .status-active {
    color: var(--success-color);
  }

  .status-inactive {
    color: var(--warning-color);
  }

  .account-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .balance-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .balance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .balance-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .balance-value {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.125rem;
  }

  .balance-value.available {
    color: var(--success-color);
  }

  .account-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-label {
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-value {
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .primary-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: auto;
  }

  .no-accounts {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .no-accounts h3 {
    margin: 1rem 0 0.5rem 0;
    color: var(--text-primary);
  }

  .accounts-info {
    margin-top: 2rem;
  }

  .info-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .info-card h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .info-card li {
    margin-bottom: 0.5rem;
  }

  @media (max-width: 640px) {
    .accounts-container {
      padding: 0.75rem;
    }

    .account-card {
      padding: 1rem;
    }

    .account-header {
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .account-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .primary-badge {
      margin-left: 0;
    }
  }
</style>
