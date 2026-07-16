<script lang="ts">
  import Section from '$lib/components/Section.svelte';
  import { ArrowLeft, PlusCircle, CreditCard, Building2, Wallet, Edit3, Trash2, Shield, CheckCircle, AlertCircle, Copy } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let withdrawalMethods: any[] = [
    { id: "wm_1", type: "bank", name: "Banco Económico", accountNumber: "1234-5678-9012-3456", accountType: "Cuenta Corriente", isDefault: true, status: "active", lastWithdrawal: "2024-01-15T10:30:00", minAmount: 50, maxAmount: 10000 },
    { id: "wm_2", type: "bank", name: "Banco Bisa", accountNumber: "9876-5432-1098-7654", accountType: "Cuenta de Ahorros", isDefault: false, status: "active", lastWithdrawal: "2024-01-10T14:20:00", minAmount: 100, maxAmount: 15000 },
    { id: "wm_3", type: "digital", name: "Billetera Digital", accountNumber: "BD-9876-5432-1098", accountType: "Billetera Virtual", isDefault: false, status: "active", lastWithdrawal: "2023-12-20T09:15:00", minAmount: 20, maxAmount: 5000 },
  ];

  let showAddForm = false;
  let newMethod = { type: "bank", name: "", accountNumber: "", accountType: "", isDefault: false, minAmount: 50, maxAmount: 10000 };
  let editingMethod: any = null;
  let showEditForm = false;
  let deletingMethodId: any = null;

  function addWithdrawalMethod() {
    if (!newMethod.name || !newMethod.accountNumber || !newMethod.accountType) return;
    const method = { id: `wm_${Date.now()}`, ...newMethod, status: "active", lastWithdrawal: new Date().toISOString() };
    if (method.isDefault) withdrawalMethods = withdrawalMethods.map(wm => ({ ...wm, isDefault: false }));
    withdrawalMethods = [method, ...withdrawalMethods];
    newMethod = { type: "bank", name: "", accountNumber: "", accountType: "", isDefault: false, minAmount: 50, maxAmount: 10000 };
    showAddForm = false;
  }

  function editWithdrawalMethod(method: any) { editingMethod = { ...method }; showEditForm = true; }

  function saveEdit() {
    if (!editingMethod.name || !editingMethod.accountNumber || !editingMethod.accountType) return;
    if (editingMethod.isDefault) withdrawalMethods = withdrawalMethods.map(wm => ({ ...wm, isDefault: false }));
    withdrawalMethods = withdrawalMethods.map(wm => wm.id === editingMethod.id ? editingMethod : wm);
    showEditForm = false; editingMethod = null;
  }

  function cancelEdit() { showEditForm = false; editingMethod = null; }
  function confirmDelete(id: string) { deletingMethodId = id; }
  function deleteWithdrawalMethod(id: string) { withdrawalMethods = withdrawalMethods.filter(wm => wm.id !== id); deletingMethodId = null; }
  function cancelDelete() { deletingMethodId = null; }
  function copyAccountNumber(text: string) { navigator.clipboard.writeText(text); }

  function setAsDefault(id: string) { withdrawalMethods = withdrawalMethods.map(wm => ({ ...wm, isDefault: wm.id === id })); }

  function getMethodIcon(type: string) {
    switch (type) { case 'bank': return Building2; case 'card': return CreditCard; case 'digital': return Wallet; default: return CreditCard; }
  }

  function formatDate(dateString: string) { return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }); }
</script>

<PageLayout title="Métodos de retiro">

  <div class="intro-box">
    <Shield size={20} />
    <p>Configura a qué bancos y cuentas se puede retirar el dinero que recibes a través de tus QR.</p>
  </div>

  {#if showAddForm}
    <Section label="Agregar Nuevo Método de Retiro">
      <div class="form">
        <div class="select-group">
          <span class="field-label">Tipo de método</span>
          <select class="native-select" bind:value={newMethod.type}>
            <option value="bank">Cuenta Bancaria</option>
            <option value="card">Tarjeta</option>
            <option value="digital">Billetera Digital</option>
          </select>
        </div>
        <TextField label="Nombre descriptivo" bind:value={newMethod.name} placeholder="Ej: Mi cuenta principal" />
        <TextField label="Número de cuenta" bind:value={newMethod.accountNumber} placeholder="Ingresa el número de cuenta" />
        <TextField label="Tipo de cuenta" bind:value={newMethod.accountType} placeholder="Ej: Cuenta Corriente, Ahorros" />
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={newMethod.isDefault}>
          <span>Establecer como método por defecto</span>
        </label>
        <div class="form-actions">
          <GhostButton onClick={() => showAddForm = false}>Cancelar</GhostButton>
          <PillButton label="Agregar Método de Retiro" onClick={addWithdrawalMethod} disabled={!newMethod.name || !newMethod.accountNumber || !newMethod.accountType} />
        </div>
      </div>
    </Section>
  {:else}
    <div style="text-align:center"><PillButton label="Agregar Método de Retiro" onClick={() => showAddForm = true} /></div>
  {/if}

  <Section label="Tus Métodos de Retiro">
    {#if withdrawalMethods.length === 0}
      <EmptyState icon={CreditCard} title="No tienes métodos de pago configurados" message="Agrega tu primer método para comenzar a usar Pagui" />
    {:else}
      {#each withdrawalMethods as method (method.id)}
        <div class="method-card" class:inactive={method.status !== 'active'}>
          <div class="method-header">
            <div class="method-icon"><svelte:component this={getMethodIcon(method.type)} size={20} /></div>
            <div class="method-info">
              <h3 class="method-name">{method.name}</h3>
              <p class="method-type">{method.accountType}</p>
              {#if method.isDefault}<span class="default-badge">Por defecto</span>{/if}
            </div>
            <div class="method-actions">
              {#if deletingMethodId === method.id}
                <div class="delete-confirmation">
                  <span>¿Eliminar?</span>
                  <button class="confirm-btn" onclick={() => deleteWithdrawalMethod(method.id)}>Sí</button>
                  <button class="cancel-btn" onclick={cancelDelete}>No</button>
                </div>
              {:else}
                {#if !method.isDefault}
                  <button class="action-btn" onclick={() => setAsDefault(method.id)} title="Establecer como predeterminado"><CheckCircle size={16} /></button>
                {/if}
                <button class="action-btn" onclick={() => editWithdrawalMethod(method)} title="Editar"><Edit3 size={16} /></button>
                <button class="action-btn danger" onclick={() => confirmDelete(method.id)} title="Eliminar"><Trash2 size={16} /></button>
              {/if}
            </div>
          </div>
          <div class="method-details">
            <div class="account-number">
              <span class="label">Número:</span>
              <span class="value">{method.accountNumber}</span>
              <button class="copy-btn" onclick={() => copyAccountNumber(method.accountNumber)} title="Copiar"><Copy size={14} /></button>
            </div>
            <div class="method-meta">
              <span>Estado: <span class={method.status}>{method.status === 'active' ? 'Activo' : 'Inactivo'}</span></span>
              <span>Último uso: {formatDate(method.lastWithdrawal)}</span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </Section>

{#if showEditForm && editingMethod}
  <div class="modal-overlay" role="presentation" onclick={cancelEdit} onkeydown={(e) => e.key === 'Escape' && cancelEdit()}>
    <div class="edit-modal" role="dialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <span class="section-label">Editar Método de Retiro</span>
      <div class="form" style="margin-top:var(--space-4)">
        <TextField label="Nombre descriptivo" bind:value={editingMethod.name} />
        <TextField label="Número de cuenta" bind:value={editingMethod.accountNumber} />
        <TextField label="Tipo de cuenta" bind:value={editingMethod.accountType} />
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={editingMethod.isDefault}>
          <span>Establecer como método por defecto</span>
        </label>
        <div class="form-actions">
          <GhostButton onClick={cancelEdit}>Cancelar</GhostButton>
          <PillButton label="Guardar Cambios" onClick={saveEdit} disabled={!editingMethod.name || !editingMethod.accountNumber || !editingMethod.accountType} />
        </div>
      </div>
    </div>
  </div>
{/if}

</PageLayout>

<style>
  .intro-box { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.3); color: rgba(var(--text-secondary-rgb), 1); }
  .intro-box p { margin: 0; font-size: var(--text-sm); line-height: 1.5; }
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .select-group { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: rgba(var(--text-secondary-rgb), 1); }
  .native-select { width: 100%; padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); height: 44px; outline: none; }
  .native-select:focus { border-color: rgba(var(--primary-rgb), 0.6); }
  .checkbox-label { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); }
  .checkbox-label input[type="checkbox"] { width: auto; margin: 0; }
  .form-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
  .empty-subtitle { font-size: var(--text-sm); opacity: 0.7; }
  .method-card { background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-xl); padding: var(--space-4); }
  .method-card.inactive { opacity: 0.6; }
  .method-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
  .method-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(var(--primary-rgb), 0.15); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .method-info { flex: 1; }
  .method-name { margin: 0; font-size: var(--text-base); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .method-type { margin: 2px 0 0; font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .default-badge { display: inline-block; background: var(--primary); color: rgba(var(--bg-rgb), 1); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; margin-top: var(--space-1); }
  .method-actions { display: flex; gap: var(--space-1); flex-shrink: 0; }
  .action-btn { background: none; border: none; padding: var(--space-1); border-radius: var(--radius-md); cursor: pointer; color: rgba(var(--text-tertiary-rgb), 1); }
  .action-btn:active { color: rgba(var(--text-primary-rgb), 1); background: rgba(var(--surface-rgb), 1); }
  .action-btn.danger:active { color: rgba(var(--error-rgb), 1); }
  .delete-confirmation { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .confirm-btn { background: rgba(var(--error-rgb), 1); color: white; border: none; padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem; }
  .cancel-btn { background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); border: none; padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem; }
  .method-details { border-top: 1px solid rgba(var(--border-rgb), 0.3); padding-top: var(--space-3); }
  .account-number { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .account-number .label { font-weight: 500; }
  .account-number .value { font-family: monospace; color: rgba(var(--text-primary-rgb), 1); }
  .copy-btn { background: none; border: none; color: var(--primary); cursor: pointer; padding: 2px; border-radius: var(--radius-sm); }
  .method-meta { display: flex; gap: var(--space-4); font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .method-meta .active { color: rgba(var(--success-rgb), 1); font-weight: 500; }
  .method-meta .inactive { color: rgba(var(--error-rgb), 1); font-weight: 500; }
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4); }
  .edit-modal { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-6); max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
</style>
