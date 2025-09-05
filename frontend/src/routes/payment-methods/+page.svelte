<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { 
    ArrowLeft,
    PlusCircle,
    CreditCard,
    Building2,
    Wallet,
    Edit3,
    Trash2,
    Shield,
    CheckCircle,
    AlertCircle,
    Copy,
    Eye,
    EyeOff
  } from '@lucide/svelte';

  // Estado de los métodos de retiro
  let withdrawalMethods = [
    {
      id: "wm_1",
      type: "bank",
      name: "Banco Económico",
      accountNumber: "1234-5678-9012-3456",
      accountType: "Cuenta Corriente",
      isDefault: true,
      status: "active",
      lastWithdrawal: "2024-01-15T10:30:00",
      minAmount: 50,
      maxAmount: 10000
    },
    {
      id: "wm_2", 
      type: "bank",
      name: "Banco Bisa",
      accountNumber: "9876-5432-1098-7654",
      accountType: "Cuenta de Ahorros",
      isDefault: false,
      status: "active",
      lastWithdrawal: "2024-01-10T14:20:00",
      minAmount: 100,
      maxAmount: 15000
    },
    {
      id: "wm_3",
      type: "digital",
      name: "Billetera Digital",
      accountNumber: "BD-9876-5432-1098",
      accountType: "Billetera Virtual",
      isDefault: false,
      status: "active",
      lastWithdrawal: "2023-12-20T09:15:00",
      minAmount: 20,
      maxAmount: 5000
    }
  ];

  // Estado para agregar nuevo método de retiro
  let showAddForm = false;
  let newMethod = {
    type: "bank",
    name: "",
    accountNumber: "",
    accountType: "",
    isDefault: false,
    minAmount: 50,
    maxAmount: 10000
  };

  // Estado para editar método
  let editingMethod: any = null;
  let showEditForm = false;

  // Estado para confirmación de eliminación
  let deletingMethodId: any = null;

  // Función para agregar nuevo método de retiro
  function addWithdrawalMethod() {
    if (!newMethod.name || !newMethod.accountNumber || !newMethod.accountType) return;
    
    const method = {
      id: `wm_${Date.now()}`,
      ...newMethod,
      status: "active",
      lastWithdrawal: new Date().toISOString()
    };

    // Si es el método por defecto, quitar el default de otros
    if (method.isDefault) {
      withdrawalMethods = withdrawalMethods.map(wm => ({ ...wm, isDefault: false }));
    }

    withdrawalMethods = [method, ...withdrawalMethods];
    
    // Limpiar formulario
    newMethod = {
      type: "bank",
      name: "",
      accountNumber: "",
      accountType: "",
      isDefault: false,
      minAmount: 50,
      maxAmount: 10000
    };
    
    showAddForm = false;
  }

  // Función para editar método
  function editWithdrawalMethod(method: any) {
    editingMethod = { ...method };
    showEditForm = true;
  }

  // Función para guardar edición
  function saveEdit() {
    if (!editingMethod.name || !editingMethod.accountNumber || !editingMethod.accountType) return;
    
    // Si es el método por defecto, quitar el default de otros
    if (editingMethod.isDefault) {
      withdrawalMethods = withdrawalMethods.map(wm => ({ ...wm, isDefault: false }));
    }

    withdrawalMethods = withdrawalMethods.map(wm => 
      wm.id === editingMethod.id ? editingMethod : wm
    );
    
    showEditForm = false;
    editingMethod = null;
  }

  // Función para cancelar edición
  function cancelEdit() {
    showEditForm = false;
    editingMethod = null;
  }

  // Función para confirmar eliminación
  function confirmDelete(id: string) {
    deletingMethodId = id;
  }

  // Función para eliminar método
  function deleteWithdrawalMethod(id: string) {
    withdrawalMethods = withdrawalMethods.filter(wm => wm.id !== id);
    deletingMethodId = null;
  }

  // Función para cancelar eliminación
  function cancelDelete() {
    deletingMethodId = null;
  }

  // Función para copiar número de cuenta
  function copyAccountNumber(text: string) {
    navigator.clipboard.writeText(text);
  }

  // Función para establecer como método por defecto
  function setAsDefault(id: string) {
    withdrawalMethods = withdrawalMethods.map(wm => ({
      ...wm,
      isDefault: wm.id === id
    }));
  }

  // Obtener icono según el tipo de método
  function getMethodIcon(type: string) {
    switch (type) {
      case 'bank': return Building2;
      case 'card': return CreditCard;
      case 'digital': return Wallet;
      default: return CreditCard;
    }
  }

  // Obtener color según el tipo de método
  function getMethodColor(type: string) {
    switch (type) {
      case 'bank': return 'var(--primary-color)';
      case 'card': return 'var(--accent-color)';
      case 'digital': return 'var(--success-color)';
      default: return 'var(--primary-color)';
    }
  }

  // Formatear fecha
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }


</script>

<svelte:head>
  <title>Métodos de Retiro | Pagui</title>
</svelte:head>

<RouteLayout title="Métodos de Retiro">
<div class="payment-methods-page">

  <div class="page-intro">
    <div class="intro-icon">
      <Shield size={24} />
    </div>
    <p>
      Configura a qué bancos y cuentas se puede retirar el dinero que recibes a través de tus QR. 
      Estos son los destinos donde se transferirá el dinero acumulado.
    </p>
  </div>

  <!-- Formulario para agregar nuevo método -->
  {#if showAddForm}
    <div class="add-method-form">
      <h2>Agregar Nuevo Método de Retiro</h2>
      
      <div class="form-grid">
        <div class="form-field">
          <label for="methodType">Tipo de método</label>
          <select id="methodType" bind:value={newMethod.type}>
            <option value="bank">Cuenta Bancaria</option>
            <option value="card">Tarjeta</option>
            <option value="digital">Billetera Digital</option>
          </select>
        </div>

        <div class="form-field">
          <label for="methodName">Nombre descriptivo</label>
          <input 
            type="text" 
            id="methodName" 
            placeholder="Ej: Mi cuenta principal"
            bind:value={newMethod.name}
          />
        </div>

        <div class="form-field">
          <label for="accountNumber">Número de cuenta</label>
          <input 
            type="text" 
            id="accountNumber" 
            placeholder="Ingresa el número de cuenta"
            bind:value={newMethod.accountNumber}
          />
        </div>

        <div class="form-field">
          <label for="accountType">Tipo de cuenta</label>
          <input 
            type="text" 
            id="accountType" 
            placeholder="Ej: Cuenta Corriente, Ahorros"
            bind:value={newMethod.accountType}
          />
        </div>
      </div>

      <div class="form-actions">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={newMethod.isDefault}>
          <span>Establecer como método por defecto</span>
        </label>
        
        <div class="action-buttons">
          <Button variant="ghost" on:click={() => showAddForm = false}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            on:click={addWithdrawalMethod}
            disabled={!newMethod.name || !newMethod.accountNumber || !newMethod.accountType}
          >
            <PlusCircle slot="icon" />
            Agregar Método de Retiro
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <div class="add-method-section">
      <Button variant="primary" on:click={() => showAddForm = true}>
        <PlusCircle slot="icon" />
        Agregar Método de Retiro
      </Button>
    </div>
  {/if}

  <!-- Lista de métodos de pago -->
  <div class="methods-list">
    <h2>Tus Métodos de Retiro</h2>
    
          {#if withdrawalMethods.length === 0}
      <div class="empty-state">
        <CreditCard size={40} opacity={0.3} />
        <p>No tienes métodos de pago configurados</p>
        <p class="empty-subtitle">Agrega tu primer método para comenzar a usar Pagui</p>
      </div>
    {:else}
             {#each withdrawalMethods as method (method.id)}
        <div class="method-card {method.status}">
          <div class="method-header">
            <div class="method-icon" style="background-color: {getMethodColor(method.type)}">
              <svelte:component this={getMethodIcon(method.type)} size={20} />
            </div>
            
            <div class="method-info">
              <h3 class="method-name">{method.name}</h3>
              <p class="method-type">{method.accountType}</p>
              {#if method.isDefault}
                <span class="default-badge">Por defecto</span>
              {/if}
            </div>

            <div class="method-actions">
              {#if deletingMethodId === method.id}
                <div class="delete-confirmation">
                  <span>¿Eliminar?</span>
                                     <button class="confirm-button" on:click={() => deleteWithdrawalMethod(method.id)}>Sí</button>
                  <button class="cancel-button" on:click={cancelDelete}>No</button>
                </div>
              {:else}
                {#if !method.isDefault}
                  <button class="action-button" on:click={() => setAsDefault(method.id)} title="Establecer como predeterminado">
                    <CheckCircle size={16} />
                  </button>
                {/if}
                                 <button class="action-button" on:click={() => editWithdrawalMethod(method)} title="Editar">
                  <Edit3 size={16} />
                </button>
                <button class="action-button delete" on:click={() => confirmDelete(method.id)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              {/if}
            </div>
          </div>

          <div class="method-details">
            <div class="account-number">
              <span class="label">Número:</span>
              <span class="value">{method.accountNumber}</span>
              <button class="copy-button" on:click={() => copyAccountNumber(method.accountNumber)} title="Copiar">
                <Copy size={14} />
              </button>
            </div>
            
            <div class="method-meta">
              <div class="meta-item">
                <span class="meta-label">Estado:</span>
                <span class="meta-value {method.status}">
                  {method.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div class="meta-item">
                <span class="meta-label">Último uso:</span>
                                 <span class="meta-value">{formatDate(method.lastWithdrawal)}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- Modal de edición -->
{#if showEditForm && editingMethod}
  <div class="modal-overlay" on:click={cancelEdit}>
    <div class="edit-modal" on:click|stopPropagation>
             <h2>Editar Método de Retiro</h2>
      
      <div class="form-grid">
        <div class="form-field">
          <label for="editMethodName">Nombre descriptivo</label>
          <input 
            type="text" 
            id="editMethodName" 
            bind:value={editingMethod.name}
          />
        </div>

        <div class="form-field">
          <label for="editAccountNumber">Número de cuenta</label>
          <input 
            type="text" 
            id="editAccountNumber" 
            bind:value={editingMethod.accountNumber}
          />
        </div>

        <div class="form-field">
          <label for="editAccountType">Tipo de cuenta</label>
          <input 
            type="text" 
            id="editAccountType" 
            bind:value={editingMethod.accountType}
          />
        </div>
      </div>

      <div class="form-actions">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={editingMethod.isDefault}>
          <span>Establecer como método por defecto</span>
        </label>
        
        <div class="action-buttons">
          <Button variant="ghost" on:click={cancelEdit}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            on:click={saveEdit}
            disabled={!editingMethod.name || !editingMethod.accountNumber || !editingMethod.accountType}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
</RouteLayout>

<style>
  .payment-methods-page {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
  }



  .page-intro {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background: var(--surface);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
    margin-bottom: var(--spacing-lg);
  }

  .intro-icon {
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .page-intro p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .add-method-section {
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }

  .add-method-form {
    background: var(--surface);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius-lg);
    border: 1px solid var(--border-color);
    margin-bottom: var(--spacing-lg);
  }

  .add-method-form h2 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: 1.2rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .form-field label {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .form-field input,
  .form-field select {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    background: var(--background);
    color: var(--text-primary);
    font-family: inherit;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    color: var(--text-primary);
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .action-buttons {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
  }

  .methods-list h2 {
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: 1.2rem;
  }

  .method-card {
    background: var(--surface);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    transition: all 0.2s;
  }

  .method-card:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .method-card.inactive {
    opacity: 0.6;
  }

  .method-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .method-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .method-info {
    flex: 1;
  }

  .method-name {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .method-type {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .default-badge {
    display: inline-block;
    background: var(--success-color);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: var(--spacing-xs);
  }

  .method-actions {
    display: flex;
    gap: var(--spacing-xs);
  }

  .action-button {
    background: none;
    border: none;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
  }

  .action-button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .action-button.delete:hover {
    background: var(--error-color);
    color: white;
  }

  .delete-confirmation {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .confirm-button,
  .cancel-button {
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
  }

  .confirm-button {
    background: var(--error-color);
    color: white;
  }

  .cancel-button {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .method-details {
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-md);
  }

  .account-number {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .account-number .label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .account-number .value {
    font-family: monospace;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--border-radius-sm);
    transition: background-color 0.2s;
  }

  .copy-button:hover {
    background: var(--surface-hover);
  }

  .method-meta {
    display: flex;
    gap: var(--spacing-lg);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .meta-value {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .meta-value.active {
    color: var(--success-color);
  }

  .meta-value.inactive {
    color: var(--error-color);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: var(--spacing-sm) 0;
  }

  .empty-subtitle {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  /* Modal de edición */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }

  .edit-modal {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .edit-modal h2 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }

  /* Responsive */
  @media (max-width: 600px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .method-meta {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
  }
</style>
