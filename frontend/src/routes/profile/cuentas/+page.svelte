<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import Section from '$lib/components/Section.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';

  import { 
    CreditCard,
    DollarSign,
    Building2,
    User,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff
  } from '@lucide/svelte';
  import { getRoleLabel } from '$lib/helpers';

  let showBalances = true;

  function formatCurrency(amount: string, currency: string): string {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(numAmount);
  }

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

<PageLayout title="Cuentas">

  <div class="accounts-container">
    <!-- Header con información del usuario -->
    <div class="user-header">
      <div class="user-info">
        <h2>{$auth.user?.fullName || 'Usuario'}</h2>
        <p class="user-role">{getRoleLabel($auth.user?.role)}</p>
      </div>
      <IconButton icon={showBalances ? EyeOff : Eye} onClick={toggleBalanceVisibility} ariaLabel={showBalances ? "Ocultar saldos" : "Mostrar saldos"} size={36} />
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
        <EmptyState icon={CreditCard} title="No tienes cuentas" message="No se encontraron cuentas asociadas a tu usuario." />
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
</PageLayout>

<style>
  .accounts-container {
    padding: var(--space-4);
    max-width: 600px;
    margin: 0 auto;
  }

  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-8);
    padding: var(--space-4);
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(var(--border-rgb), 1);
  }

  .user-info h2 {
    margin: 0;
    color: rgba(var(--text-primary-rgb), 1);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .user-role {
    margin: var(--space-1) 0 0 0;
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: 0.875rem;
    text-transform: capitalize;
  }

  .accounts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  .account-card {
    background: rgba(var(--surface-rgb), 1);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    transition: all 0.2s ease;
  }

  .account-card.primary {
    border-color: var(--primary);
    background: linear-gradient(135deg, rgba(var(--surface-rgb), 1) 0%, rgba(var(--primary-rgb), 0.05) 100%);
  }

  .account-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .account-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
  }

  .account-info {
    flex: 1;
  }

  .account-type {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    color: rgba(var(--text-primary-rgb), 1);
    font-weight: 600;
  }

  .account-number {
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: 0.875rem;
    font-family: monospace;
  }

  .account-status {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.875rem;
  }

  .account-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: 0.875rem;
  }

  .balance-value {
    color: rgba(var(--text-primary-rgb), 1);
    font-weight: 600;
    font-size: 1.125rem;
  }

  .balance-value.available {
    color: rgba(var(--success-rgb), 1);
  }

  .account-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .meta-label {
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-value {
    color: rgba(var(--text-primary-rgb), 1);
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .primary-badge {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--primary);
    color: white;
    padding: var(--space-1) var(--space-2);
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: auto;
  }

  .accounts-info {
    margin-top: var(--space-8);
  }

  .info-card {
    background: rgba(var(--surface-rgb), 1);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }

  .info-card h4 {
    margin: 0 0 var(--space-4) 0;
    color: rgba(var(--text-primary-rgb), 1);
    font-size: 1rem;
    font-weight: 600;
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.25rem;
    color: rgba(var(--text-secondary-rgb), 1);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .info-card li {
    margin-bottom: var(--space-2);
  }

  @media (max-width: 640px) {
    .account-card {
      padding: var(--space-4);
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
