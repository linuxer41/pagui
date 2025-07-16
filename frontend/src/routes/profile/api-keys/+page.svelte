<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import { 
    ArrowLeft,
    PlusCircle,
    Trash2,
    Copy,
    AlertCircle,
    Eye,
    EyeOff,
    Check,
    Code,
    RefreshCw
  } from '@lucide/svelte';
  import ProfilePage from '$lib/components/layouts/ProfilePage.svelte';
  
  // Estado de las API keys
  let apiKeys = [
    {
      id: "api_key_1",
      name: "Aplicación Web",
      key: "sk_test_8hd7eh8Hd92h398Hd8h29",
      created: "2023-05-12T10:30:00",
      lastUsed: "2023-06-15T14:25:00"
    },
    {
      id: "api_key_2",
      name: "Integración ERP",
      key: "sk_test_9j73jdKd93jd8dj37Hd7d",
      created: "2023-04-20T08:15:00",
      lastUsed: "2023-06-14T09:45:00"
    }
  ];
  
  // Estado para la nueva API key
  let newApiKey = null;
  let newKeyName = "";
  let isCreating = false;
  let showNewKey = true;
  
  // Estado para confirmación de eliminación
  let deletingKeyId = null;
  
  // Función para crear nueva API key
  function createApiKey() {
    if (!newKeyName.trim()) return;
    
    isCreating = true;
    
    // Simulación de llamada a API
    setTimeout(() => {
      const generatedKey = `sk_test_${generateRandomString(24)}`;
      newApiKey = {
        name: newKeyName,
        key: generatedKey,
        created: new Date().toISOString(),
      };
      
      // Limpiar estado
      newKeyName = "";
      isCreating = false;
    }, 1000);
  }
  
  // Función para confirmar eliminación
  function confirmDelete(id) {
    deletingKeyId = id;
  }
  
  // Función para eliminar API key
  function deleteApiKey(id) {
    apiKeys = apiKeys.filter(key => key.id !== id);
    deletingKeyId = null;
  }
  
  // Función para cancelar eliminación
  function cancelDelete() {
    deletingKeyId = null;
  }
  
  // Función para copiar al portapapeles
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }
  
  // Función para cerrar el panel de nueva API key
  function closeNewKeyPanel() {
    newApiKey = null;
  }
  
  // Función para generar un string aleatorio
  function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  // Formatear fecha
  function formatDate(dateString) {
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
  
  function goBack() {
    goto('/profile/editar-perfil');
  }
</script>

<ProfilePage title="API Keys">
  <div class="page-intro">
    <div class="intro-icon">
      <Code size={24} />
    </div>
    <p>
      Las API keys te permiten integrar tu cuenta con aplicaciones externas 
      de manera segura. Mantén estas claves en privado y nunca las compartas públicamente.
    </p>
  </div>
  
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
        <div class="key-name">{newApiKey.name}</div>
        <div class="key-value-container">
          <div class="key-value">
            {#if showNewKey}
              <span class="key-text">{newApiKey.key}</span>
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
          
          <button class="icon-button copy-button" on:click={() => copyToClipboard(newApiKey.key)}>
            <Copy size={18} />
          </button>
        </div>
        
        <div class="key-created">
          Creada el {formatDate(newApiKey.created)}
        </div>
        
        <div class="new-key-actions">
          <Button variant="primary" on:click={closeNewKeyPanel}>
            <Check slot="icon" />
            Entendido
          </Button>
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
        
        <Button 
          variant="primary" 
          on:click={createApiKey} 
          disabled={isCreating || !newKeyName.trim()}
          loading={isCreating}
        >
          <PlusCircle slot="icon" />
          Crear API Key
        </Button>
      </div>
    </div>
  {/if}
  
  <div class="api-keys-list">
    <h2>Tus API keys</h2>
    
    {#if apiKeys.length === 0}
      <div class="empty-state">
        <Code size={40} opacity={0.3} />
        <p>No tienes API keys creadas</p>
      </div>
    {:else}
      {#each apiKeys as apiKey (apiKey.id)}
        <div class="api-key-card">
          <div class="api-key-header">
            <div class="api-key-name">{apiKey.name}</div>
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
              <span class="key-prefix">{apiKey.key.substring(0, 10)}</span>••••••••••••••
            </div>
            
            <div class="api-key-dates">
              <div class="date-item">
                <span class="date-label">Creada:</span>
                <span class="date-value">{formatDate(apiKey.created)}</span>
              </div>
              
              {#if apiKey.lastUsed}
                <div class="date-item">
                  <span class="date-label">Último uso:</span>
                  <span class="date-value">{formatDate(apiKey.lastUsed)}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</ProfilePage>

<style>
  .app-container {
    padding: var(--spacing-md);
    max-width: 700px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    background-color: var(--background, #f2f5f9);
    min-height: 100vh;
  }
  
  .app-header {
    display: flex;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }
  
  .app-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    text-align: center;
    flex: 1;
    color: var(--text-primary);
  }
  
  .back-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  
  .back-button:hover {
    background-color: var(--surface-variant, #f5f5f5);
  }
  
  .page-intro {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background: var(--surface, white);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-md);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .intro-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--border-radius-md);
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .page-intro p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  
  .create-key-section, .api-keys-list, .new-key-panel {
    background: var(--surface, white);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .create-key-section h2, .api-keys-list h2, .new-key-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
  }
  
  .create-key-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .form-field label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .form-field input {
    padding: 12px;
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
    background: var(--surface-variant, #f5f5f5);
    font-size: 1rem;
    color: var(--text-primary);
  }
  
  .form-field input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(58, 102, 255, 0.1);
  }
  
  .new-key-panel {
    border: 2px solid #10b981;
    animation: pulse 2s infinite;
  }
  
  .new-key-header {
    margin-bottom: var(--spacing-md);
  }
  
  .warning {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--warning-color, #f59e0b);
    font-weight: 500;
    margin: var(--spacing-sm) 0 0;
  }
  
  .new-key-details {
    background: var(--surface-variant, #f5f5f5);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
  }
  
  .key-name {
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
  }
  
  .key-value-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }
  
  .key-value {
    flex: 1;
    font-family: monospace;
    padding: 10px;
    background: var(--surface, white);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border-color);
    font-size: 0.9rem;
    color: var(--text-primary);
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .key-created {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
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
    background: var(--surface-variant, #f5f5f5);
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .icon-button:hover {
    background: var(--border-color);
  }
  
  .toggle-visibility {
    color: var(--primary-color);
  }
  
  .copy-button {
    color: var(--text-secondary);
  }
  
  .api-key-card {
    background: var(--surface-variant, #f5f5f5);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }
  
  .api-key-card:last-child {
    margin-bottom: 0;
  }
  
  .api-key-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }
  
  .api-key-name {
    font-weight: 600;
    color: var(--text-primary);
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
    border-radius: var(--border-radius-sm);
    border: none;
    font-size: 0.8rem;
    cursor: pointer;
  }
  
  .confirm-button {
    background: #ef4444;
    color: white;
  }
  
  .cancel-button {
    background: var(--border-color);
    color: var(--text-secondary);
  }
  
  .api-key-value {
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }
  
  .key-prefix {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .api-key-dates {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  
  .date-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .date-label {
    opacity: 0.8;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl) 0;
    color: var(--text-secondary);
    text-align: center;
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
    .app-container {
      padding: var(--spacing-sm);
    }
    
    .api-key-dates {
      flex-direction: column;
      gap: 2px;
    }
  }
</style> 