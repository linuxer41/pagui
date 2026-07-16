<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import api from '$lib/api';
  import { get } from 'svelte/store';
  import { 
    PlusCircle,
    Trash2,
    Copy,
    AlertCircle,
    Eye,
    EyeOff,
    Check,
    RefreshCw,
    BookOpen,
    Key,
    Calendar,
    CheckCircle,
    XCircle,
    Clock
  } from '@lucide/svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  
  // Estado de las API keys
  let apiKeys: any[] = [];
  let loading = true;
  let error: string | null = null;
  
  // Estado para la nueva API key
  let newApiKey: any = null;
  let newKeyName = "";
  let newKeyPermissions = {
    qr_generate: true,
    qr_status: true,
    qr_cancel: false
  };
  let newKeyExpiry = "";
  let isCreating = false;
  let showNewKey = true;
  
  // Debug: Log cuando cambie newApiKey
  $: if (newApiKey) {
    console.log('Estado newApiKey actualizado:', newApiKey);
  }
  
  // Estado para confirmación de eliminación
  let deletingKeyId: any = null;
  
  // Estado para mostrar documentación
  // let showDocumentation = false; // Removed - documentation moved to separate page
  
  // Cargar API keys al montar el componente
  onMount(async () => {
    await loadApiKeys();
  });
  
  // Función para cargar API keys
  async function loadApiKeys() {
    try {
      loading = true;
      error = null;
      
      const authStore = get(auth);
      if (!authStore.token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await api.listApiKeys({ token: authStore.token });
      
      if (response.success) {
        apiKeys = response.data || [];
      } else {
        throw new Error(response.message || 'Error cargando API keys');
      }
    } catch (err: any) {
      error = err.message || 'Error desconocido';
      console.error('Error cargando API keys:', err);
    } finally {
      loading = false;
    }
  }
  
  // Función para crear nueva API key
  async function createApiKey() {
    if (!newKeyName.trim()) return;
    
    try {
      isCreating = true;
      error = null;
      
      const authStore = get(auth);
      if (!authStore.token) {
        throw new Error('No hay token de autenticación');
      }
      
      const keyData = {
        description: newKeyName,
        permissions: newKeyPermissions,
        expiresAt: newKeyExpiry || undefined
      };
      
      const response = await api.generateApiKey(keyData, { token: authStore.token });
      
      console.log('Respuesta de la API:', response); // Debug
      
      if (response.success) {
        newApiKey = response.data;
        console.log('Nueva API key asignada:', newApiKey); // Debug
        
        // Limpiar formulario
        newKeyName = "";
        newKeyPermissions = {
          qr_generate: true,
          qr_status: true,
          qr_cancel: false
        };
        newKeyExpiry = "";
        
        // Recargar lista
        await loadApiKeys();
        
        // Scroll hacia arriba para mostrar la nueva API key
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response.message || 'Error creando API key');
      }
    } catch (err: any) {
      error = err.message || 'Error desconocido';
      console.error('Error creando API key:', err);
    } finally {
      isCreating = false;
    }
  }
  
  // Función para confirmar eliminación
  function confirmDelete(id: any) {
    deletingKeyId = id;
  }
  
  // Función para eliminar API key
  async function deleteApiKey(id: any) {
    try {
      const authStore = get(auth);
      if (!authStore.token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await api.revokeApiKey(id, { token: authStore.token });
      
      if (response.success) {
        // Recargar lista
        await loadApiKeys();
      } else {
        throw new Error(response.message || 'Error eliminando API key');
      }
    } catch (err: any) {
      error = err.message || 'Error desconocido';
      console.error('Error eliminando API key:', err);
    } finally {
      deletingKeyId = null;
    }
  }
  
  // Función para cancelar eliminación
  function cancelDelete() {
    deletingKeyId = null;
  }
  
  // Función para copiar al portapapeles
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Aquí podrías mostrar un toast de confirmación
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  }
  
  // Función para cerrar el panel de nueva API key
  function closeNewKeyPanel() {
    newApiKey = null;
  }
  
  // Función para alternar permisos
  function togglePermission(permission: keyof typeof newKeyPermissions) {
    newKeyPermissions[permission] = !newKeyPermissions[permission];
    newKeyPermissions = { ...newKeyPermissions };
  }
  
  // Formatear fecha
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
  
  // Obtener estado de la API key
  function getApiKeyStatus(apiKey: any) {
    if (apiKey.status === 'active') {
      return { text: 'Activa', icon: CheckCircle, color: 'rgba(var(--success-rgb), 1)' };
    } else if (apiKey.status === 'expired') {
      return { text: 'Expirada', icon: XCircle, color: 'rgba(var(--error-rgb), 1)' };
    } else if (apiKey.status === 'revoked') {
      return { text: 'Revocada', icon: XCircle, color: 'rgba(var(--error-rgb), 1)' };
    } else {
      return { text: 'Desconocido', icon: Clock, color: 'rgba(var(--text-secondary-rgb), 1)' };
    }
  }
  
  // Verificar si la API key está expirada
  function isExpired(apiKey: any) {
    if (!apiKey.expiresAt) return false;
    return new Date(apiKey.expiresAt) < new Date();
  }
</script>

<svelte:head>
  <title>API Keys | Pagui</title>
</svelte:head>

<PageLayout title="API Keys">
  <div class="page-intro">
    <div class="intro-icon">
      <Key size={24} />
    </div>
    <div class="intro-content">
      <p>
        Las API Keys te permiten integrar tu cuenta con aplicaciones externas 
        de manera segura. Mantén estas claves en privado y nunca las compartas públicamente.
      </p>
      <button class="doc-button" on:click={() => goto('/profile/api-keys/documentation')}>
        <BookOpen size={16} />
        Ver Documentación
      </button>
    </div>
  </div>
  
  <!-- Documentation moved to /profile/api-keys/documentation -->
  
  {#if error}
    <div class="error-message">
      <AlertCircle size={20} />
      <span>{error}</span>
      <button class="retry-button" on:click={loadApiKeys}>
        <RefreshCw size={16} />
        Reintentar
      </button>
    </div>
  {/if}
  
  {#if newApiKey}
    <div class="new-key-panel">
      <div class="new-key-header">
        <h2>¡Nueva API key creada!</h2>
        <p class="warning">
          <AlertCircle size={16} />
          Guárdala ahora. No podrás verla completa otra vez.
        </p>
      </div>
      
      <div class="new-key-details">
        <div class="key-name">{newApiKey.description}</div>
        <div class="key-value-container">
          <div class="key-value">
            {#if showNewKey}
              <span class="key-text">{newApiKey.apiKey}</span>
            {:else}
              <span class="key-text">••••••••••••••••••••••••</span>
            {/if}
          </div>
          
          <button class="icon-button toggle-visibility" on:click={() => showNewKey = !showNewKey}>
            {#if showNewKey}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
          
          <button class="icon-button copy-button" on:click={() => copyToClipboard(newApiKey.apiKey)}>
            <Copy size={18} />
          </button>
        </div>
        
        <div class="key-info">
          <div class="key-created">
            <Calendar size={14} />
            Creada el {formatDate(newApiKey.createdAt)}
          </div>
          {#if newApiKey.expiresAt}
            <div class="key-expires">
              <Clock size={14} />
              Expira el {formatDate(newApiKey.expiresAt)}
            </div>
          {/if}
        </div>
        
        <div class="new-key-actions">
          <PillButton label="Entendido" onClick={closeNewKeyPanel} fullWidth />
        </div>
      </div>
    </div>
  {:else}
    <div class="create-key-section">
      <h2>Crear nueva API key</h2>
      
      <div class="create-key-form">
        <div class="form-field">
          <label for="keyName">Nombre descriptivo</label>
          <input 
            type="text" 
            id="keyName" 
            placeholder="Ej: Integración con mi tienda"
            bind:value={newKeyName}
          />
        </div>
        
        <div class="form-field">
          <label for="keyExpiry">Fecha de expiración (opcional)</label>
          <input 
            type="datetime-local" 
            id="keyExpiry"
            bind:value={newKeyExpiry}
          />
        </div>
        
        <div class="permissions-section">
          <span>Permisos</span>
          <div class="permissions-grid">
            <div class="permission-category">
              <h4>Permisos QR</h4>
              <label class="permission-checkbox">
                <input 
                  type="checkbox" 
                  bind:checked={newKeyPermissions.qr_generate}
                />
                <span>Generar códigos QR</span>
              </label>
              <label class="permission-checkbox">
                <input 
                  type="checkbox" 
                  bind:checked={newKeyPermissions.qr_status}
                />
                <span>Consultar estado de QR</span>
              </label>
              <label class="permission-checkbox">
                <input 
                  type="checkbox" 
                  bind:checked={newKeyPermissions.qr_cancel}
                />
                <span>Cancelar códigos QR</span>
              </label>
            </div>
          </div>
        </div>
        
        <PillButton 
          label="Crear API Key" 
          onClick={createApiKey} 
          disabled={isCreating || !newKeyName.trim()}
          loading={isCreating}
          fullWidth
        />
      </div>
    </div>
  {/if}
  
  <div class="api-keys-list">
    <div class="list-header">
      <h2>Tus API keys</h2>
      <button class="refresh-button" on:click={loadApiKeys} disabled={loading}>
        <RefreshCw size={16} />
        Actualizar
      </button>
    </div>
    
    {#if loading}
      <Skeleton width="100%" height="120px" radius="lg" count={3} gap="space-2" />
    {:else if apiKeys.length === 0}
      <EmptyState icon={Key} title="No tienes API keys creadas" message="Crea tu primera API key para comenzar a integrar aplicaciones" />
    {:else}
      {#each apiKeys as apiKey (apiKey.id)}
        <div class="api-key-card">
          <div class="api-key-header">
            <div class="api-key-info">
              <div class="api-key-name" title={apiKey.description}>{apiKey.description}</div>
              <div class="api-key-status">
                {#if isExpired(apiKey)}
                  <Clock size={14} />
                  <span class="expired">Expirada</span>
                {:else}
                  {@const status = getApiKeyStatus(apiKey)}
                  <svelte:component this={status.icon} size={14} />
                  <span style="color: {status.color}">{status.text}</span>
                {/if}
              </div>
            </div>
            
            {#if deletingKeyId === apiKey.id}
              <div class="delete-confirmation">
                <span>¿Eliminar?</span>
                <button class="confirm-button" on:click={() => deleteApiKey(apiKey.id)}>Sí</button>
                <button class="cancel-button" on:click={cancelDelete}>No</button>
              </div>
            {:else}
              <button class="delete-button" on:click={() => confirmDelete(apiKey.id)}>
                <Trash2 size={16} />
              </button>
            {/if}
          </div>
          
          <div class="api-key-details">
            <div class="api-key-value">
              <span class="key-prefix">{apiKey.apiKey.substring(0, 10)}</span>••••••••••••••
              <button class="copy-mini" on:click={() => copyToClipboard(apiKey.apiKey)}>
                <Copy size={14} />
              </button>
            </div>
            
            <div class="api-key-dates">
              <div class="date-item">
                <span class="date-label">Creada:</span>
                <span class="date-value">{formatDate(apiKey.createdAt)}</span>
              </div>
              
              {#if apiKey.expiresAt}
                <div class="date-item">
                  <span class="date-label">Expira:</span>
                  <span class="date-value {isExpired(apiKey) ? 'expired' : ''}">
                    {formatDate(apiKey.expiresAt)}
                  </span>
                </div>
              {/if}
              
              {#if apiKey.lastUsed}
                <div class="date-item">
                  <span class="date-label">Último uso:</span>
                  <span class="date-value">{formatDate(apiKey.lastUsed)}</span>
                </div>
              {/if}
            </div>
            
            <div class="api-key-permissions">
              <span class="permissions-label">Permisos:</span>
              <div class="permission-tags">
                {#if apiKey.permissions?.qr_generate}
                  <span class="permission-tag qr-generate">QR: Generar</span>
                {/if}
                {#if apiKey.permissions?.qr_status}
                  <span class="permission-tag qr-status">QR: Estado</span>
                {/if}
                {#if apiKey.permissions?.qr_cancel}
                  <span class="permission-tag qr-cancel">QR: Cancelar</span>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</PageLayout>

<style>
  .page-intro {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    background: rgba(var(--surface-rgb), 1);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .intro-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .intro-content {
    flex: 1;
  }
  
  .page-intro p {
    margin: 0 0 var(--space-2) 0;
    font-size: 0.95rem;
    color: rgba(var(--text-secondary-rgb), 1);
    line-height: 1.5;
  }
  
  .doc-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .doc-button:hover {
    background: #CC6A00;
  }
  
  /* Documentation styles moved to separate page */
  
  .error-message {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .retry-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #ef4444;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .retry-button:hover {
    background: #dc2626;
  }
  
  .create-key-section, .api-keys-list, .new-key-panel {
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: var(--space-6);
  }
  
  .create-key-section h2, .api-keys-list h2, .new-key-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 var(--space-4);
    color: rgba(var(--text-primary-rgb), 1);
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }
  
  .refresh-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(var(--surface-rgb), 1);
    border: 1px solid rgba(var(--border-rgb), 1);
    color: rgba(var(--text-secondary-rgb), 1);
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .refresh-button:hover:not(:disabled) {
    background: rgba(var(--surface-alt-rgb), 1);
    color: rgba(var(--text-primary-rgb), 1);
  }
  
  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .create-key-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .form-field label {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(var(--text-secondary-rgb), 1);
  }
  
  .form-field input {
    padding: 12px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(var(--border-rgb), 1);
    background: var(--background);
    font-size: 1rem;
    color: rgba(var(--text-primary-rgb), 1);
  }
  
  .form-field input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(58, 102, 255, 0.1);
  }
  
  .permissions-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .permissions-section label {
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(var(--text-secondary-rgb), 1);
  }
  
  .permissions-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
    max-width: 400px;
  }
  
  .permission-category {
    background: var(--background);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid rgba(var(--border-rgb), 1);
  }
  
  .permission-category h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 var(--space-2);
    color: rgba(var(--text-primary-rgb), 1);
  }
  
  .permission-checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    cursor: pointer;
  }
  
  .permission-checkbox input[type="checkbox"] {
    margin: 0;
  }
  
  .permission-checkbox span {
    font-size: 0.85rem;
    color: rgba(var(--text-secondary-rgb), 1);
  }
  
  .new-key-panel {
    border: 2px solid #10b981;
    animation: pulse 2s infinite;
  }
  
  .new-key-header {
    margin-bottom: var(--space-4);
  }
  
  .warning {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--warning-color, #f59e0b);
    font-weight: 500;
    margin: var(--space-2) 0 0;
  }
  
  .new-key-details {
    background: var(--background);
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }
  
  .key-name {
    font-weight: 600;
    margin-bottom: var(--space-1);
    color: rgba(var(--text-primary-rgb), 1);
  }
  
  .key-value-container {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }
  
  .key-value {
    flex: 1;
    font-family: monospace;
    padding: 10px;
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(var(--border-rgb), 1);
    font-size: 0.9rem;
    color: rgba(var(--text-primary-rgb), 1);
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .key-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }
  
  .key-created, .key-expires {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: rgba(var(--text-secondary-rgb), 1);
  }
  
  .new-key-actions {
    display: flex;
    justify-content: flex-end;
  }
  
  .icon-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border: 1px solid rgba(var(--border-rgb), 1);
    color: rgba(var(--text-secondary-rgb), 1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .icon-button:hover {
    background: rgba(var(--surface-alt-rgb), 1);
    border-color: var(--primary);
  }
  
  .toggle-visibility {
    color: var(--primary);
  }
  
  .copy-button {
    color: rgba(var(--text-secondary-rgb), 1);
  }
  

  
  
  .api-key-card {
    background: var(--background);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    border: 1px solid rgba(var(--border-rgb), 1);
  }
  
  .api-key-card:last-child {
    margin-bottom: 0;
  }
  
  .api-key-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }
  
  .api-key-info {
    flex: 1;
  }
  
  .api-key-name {
    font-weight: 600;
    color: rgba(var(--text-primary-rgb), 1);
    margin-bottom: var(--space-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }
  
  .api-key-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }
  
  .expired {
    color: var(--error-color, #ef4444);
  }
  
  .delete-button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(239, 68, 68, 0.1);
    border: none;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .delete-button:hover {
    background: rgba(239, 68, 68, 0.2);
  }
  
  .delete-confirmation {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .delete-confirmation span {
    font-size: 0.85rem;
    color: #ef4444;
  }
  
  .confirm-button, .cancel-button {
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: none;
    font-size: 0.8rem;
    cursor: pointer;
  }
  
  .confirm-button {
    background: #ef4444;
    color: white;
  }
  
  .cancel-button {
    background: rgba(var(--border-rgb), 1);
    color: rgba(var(--text-secondary-rgb), 1);
  }
  
  .api-key-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: monospace;
    font-size: 0.9rem;
    color: rgba(var(--text-secondary-rgb), 1);
    margin-bottom: var(--space-2);
    background: rgba(var(--surface-rgb), 1);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(var(--border-rgb), 1);
  }
  
  .key-prefix {
    color: rgba(var(--text-primary-rgb), 1);
    font-weight: 500;
  }
  
  .copy-mini {
    background: none;
    border: none;
    color: rgba(var(--text-secondary-rgb), 1);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .copy-mini:hover {
    background: rgba(var(--surface-alt-rgb), 1);
    color: var(--primary);
  }
  
  .api-key-dates {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: 0.8rem;
    color: rgba(var(--text-secondary-rgb), 1);
    margin-bottom: var(--space-2);
  }
  
  .date-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .date-label {
    opacity: 0.8;
  }
  
  .api-key-permissions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .permissions-label {
    font-size: 0.8rem;
    color: rgba(var(--text-secondary-rgb), 1);
    font-weight: 500;
  }
  
  .permission-tags {
    display: flex;
    gap: var(--space-1);
  }
  
  .permission-tag {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
  }
  
  .permission-tag.qr-generate {
    background: var(--primary);
  }
  
  .permission-tag.qr-status {
    background: var(--accent-color);
  }
  
  .permission-tag.qr-cancel {
    background: var(--success-color, #10b981);
  }
  
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }
    70% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }
  
  @media (max-width: 600px) {
    .api-key-dates {
      flex-direction: column;
      gap: 2px;
    }
    
    .list-header {
      flex-direction: column;
      gap: var(--space-2);
      align-items: flex-start;
    }
    
    .api-key-name {
      max-width: 200px;
    }
  }
</style> 