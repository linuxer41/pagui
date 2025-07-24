<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  import { 
    User,
    Save,
    Phone,
    Mail,
    Upload,
    Key,
    Camera,
    Check,
    ArrowLeft,
    Code

  } from '@lucide/svelte';
  import ProfilePage from '$lib/components/layouts/ProfilePage.svelte';

  // Datos del usuario
  let fullName = $auth.user?.fullName || '';
  let email = $auth.user?.email || '';
  let phone = '+591 77712345'; // Normalmente vendría de la API
  let profileImage: File | null = null;
  let imagePreview = '';
  
  let saving = false;
  let saveMsg = '';
  let error = '';

  // Cargar los datos actuales del perfil
  onMount(async () => {
    try {
      // Aquí podríamos hacer una llamada API para obtener todos los datos actualizados
      // Por ahora usamos los del store
      fullName = $auth.user?.fullName || '';
      email = $auth.user?.email || '';
    } catch (err) {
      console.error('Error cargando datos del perfil:', err);
    }
  });

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    profileImage = file;
    
    // Crear preview de la imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  async function handleSaveProfile() {
    if (!fullName.trim()) {
      error = 'El nombre es obligatorio';
      return;
    }
    
    error = '';
    saving = true;
    
    try {
      // Preparar datos para actualizar
      const profileData = {
        fullName,
        phone,
        profileImage
      };
      
      // Llamar a la API para actualizar el perfil
      const response = await api.updateProfile(profileData);
      
      if (response.success) {
        // Si la API devuelve los datos actualizados del usuario, actualizar el store
        if (response.data && response.data.user) {
          auth.updateUser(response.data.user);
        } else {
          // Si no, actualizar solo los campos que sabemos que cambiaron
          if ($auth.user) {
            const updatedUser = {
              ...$auth.user,
              fullName
            };
            auth.updateUser(updatedUser);
          }
        }
        
        saveMsg = 'Perfil actualizado correctamente';
        toasts.show('Perfil actualizado correctamente', 'success');
        
        // Limpiar después de un tiempo
        setTimeout(() => {
          saveMsg = '';
        }, 3000);
      } else {
        error = response.message || 'Error al actualizar el perfil';
        toasts.show(error, 'error');
      }
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      error = err instanceof Error ? err.message : 'Error de conexión al actualizar el perfil';
      toasts.show(error, 'error');
    } finally {
      saving = false;
    }
  }
</script>

<ProfilePage title="Editar perfil">
  <div slot="actions">
    <button 
      class="save-button" 
      on:click={handleSaveProfile}
      disabled={saving}
      aria-label="Guardar"
    >
      {#if saving}
        <div class="loading-spinner"></div>
      {:else}
        <Check size={20} />
      {/if}
    </button>
  </div>
  <div class="app-container">
    
    {#if error}
      <div class="notification error">
        {error}
      </div>
    {/if}
    
    {#if saveMsg}
      <div class="notification success">
        {saveMsg}
      </div>
    {/if}
    
    <div class="profile-avatar-section">
      <div class="avatar-container">
        {#if imagePreview}
          <img src={imagePreview} alt="Vista previa" class="avatar-preview" />
        {:else}
          <div class="avatar-placeholder">
            {fullName.charAt(0).toUpperCase()}
          </div>
        {/if}
        
        <label for="profile-image" class="avatar-upload-button">
          <Camera size={18} />
        </label>
        <input 
          type="file" 
          id="profile-image" 
          accept="image/*" 
          on:change={handleFileChange} 
          class="hidden-input" 
        />
      </div>
      <p class="avatar-help-text">Toca para cambiar tu foto</p>
    </div>
    
    <div class="form-cards">
      <!-- Información personal -->
      <div class="form-card">
        <div class="form-card-header">
          <h2>Información personal</h2>
        </div>
        
        <div class="form-fields">
          <div class="form-field">
            <Input
              id="fullName"
              label="Nombre completo"
              type="text"
              bind:value={fullName}
              placeholder="Tu nombre completo"
              required
              icon={User}
            />
          </div>
          <div class="form-field">
            <Input
              id="phone"
              label="Teléfono"
              type="tel"
              bind:value={phone}
              placeholder="Tu número de teléfono"
              icon={Phone}
            />
          </div>
          <div class="form-field">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              placeholder="Tu email"
              icon={Mail}
              disabled
            />
            <div class="field-note">
              El email no se puede modificar
            </div>
          </div>
        </div>
      </div>
      
      <!-- Seguridad -->
      <div class="form-card">
        <div class="form-card-header">
          <h2>Seguridad</h2>
        </div>
        
        <div class="action-button" on:click={() => goto('/profile/cambiar-clave')}>
          <div class="action-button-icon">
            <Key size={18} />
          </div>
          <div class="action-button-text">
            <span>Cambiar contraseña</span>
          </div>
          <div class="action-button-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </div>
        </div>
        
        <div class="action-button" on:click={() => goto('/profile/api-keys')}>
          <div class="action-button-icon api-key-icon">
            <Code size={18} />
          </div>
          <div class="action-button-text">
            <span>Gestión de API Keys</span>
          </div>
          <div class="action-button-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</ProfilePage>

<style>
  .app-container{
    padding: 0;
  }
  .save-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .save-button:hover {
    background: var(--surface-variant);
  }
  
  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(58, 102, 255, 0.3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s linear infinite;
  }
  
  .notification {
    padding: var(--spacing-md);
    border-radius: var(--border-radius-lg);
    font-weight: 500;
    animation: slideDown 0.3s ease;
  }
  
  .notification.error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
  }
  
  .notification.success {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
  }
  
  .profile-avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: var(--spacing-lg) 0;
  }
  
  .avatar-container {
    position: relative;
    margin-bottom: var(--spacing-sm);
  }
  
  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(58, 102, 255, 0.2);
  }
  
  .avatar-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .avatar-upload-button {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }
  
  .avatar-upload-button:hover {
    transform: scale(1.1);
  }
  
  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .avatar-help-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }
  
  .form-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .form-card {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .form-card-header {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }
  
  .form-card-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
  
  .form-fields {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .field-note {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  
  .action-button {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .action-button:hover {
    background: var(--surface-variant);
  }
  
  .action-button-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-md);
  }
  
  .action-button-text {
    flex: 1;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .action-button-arrow {
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .action-button-icon.api-key-icon {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
</style> 