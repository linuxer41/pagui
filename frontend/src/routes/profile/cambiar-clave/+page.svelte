<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { 
    Key,
    Save,
    Eye,
    EyeOff,
    Check,
    Lock
  } from '@lucide/svelte';
  import ProfilePage from '$lib/components/layouts/ProfilePage.svelte';

  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  
  let saving = false;
  let saveMsg = '';
  let error = '';
  
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;

  function togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    if (field === 'current') {
      showCurrentPassword = !showCurrentPassword;
    } else if (field === 'new') {
      showNewPassword = !showNewPassword;
    } else {
      showConfirmPassword = !showConfirmPassword;
    }
  }
  
  function handleChangePassword() {
    // Validaciones
    if (!currentPassword) {
      error = 'Debe ingresar su contraseña actual';
      return;
    }
    
    if (!newPassword) {
      error = 'Debe ingresar una nueva contraseña';
      return;
    }
    
    if (newPassword.length < 8) {
      error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }
    
    if (newPassword !== confirmPassword) {
      error = 'Las contraseñas no coinciden';
      return;
    }
    
    error = '';
    saving = true;
    
    // Simular cambio de contraseña (aquí iría la llamada a la API real)
    setTimeout(() => {
      // Verificar contraseña actual (simulado)
      if (currentPassword === '12345678') {
        saveMsg = 'Contraseña actualizada correctamente';
        
        // Limpiar campos
        currentPassword = '';
        newPassword = '';
        confirmPassword = '';
      } else {
        error = 'La contraseña actual es incorrecta';
      }
      
      saving = false;
      
      // Limpiar mensaje de éxito después de un tiempo
      if (saveMsg) {
        setTimeout(() => {
          saveMsg = '';
        }, 3000);
      }
    }, 1500);
  }
</script>

<ProfilePage title="Cambiar clave">
  <div slot="actions">
    <button 
      class="save-button" 
      on:click={handleChangePassword}
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
  
  <div class="password-icon-container">
    <div class="password-icon">
      <Lock size={32} />
    </div>
  </div>
  
  <div class="form-card">
    <div class="form-fields">
      <div class="form-field">
        <label for="current-password">Contraseña actual</label>
        <div class="password-input-container">
          <input 
            id="current-password"
            type={showCurrentPassword ? 'text' : 'password'}
            bind:value={currentPassword}
            placeholder="Ingrese su contraseña actual"
            required
          />
          <button 
            type="button" 
            class="password-toggle" 
            on:click={() => togglePasswordVisibility('current')}
            aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {#if showCurrentPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
      </div>
      
      <div class="form-field">
        <label for="new-password">Nueva contraseña</label>
        <div class="password-input-container">
          <input 
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            bind:value={newPassword}
            placeholder="Ingrese su nueva contraseña"
            required
          />
          <button 
            type="button" 
            class="password-toggle" 
            on:click={() => togglePasswordVisibility('new')}
            aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {#if showNewPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
        <div class="password-hint">
          <div class="hint-dot" class:active={newPassword.length >= 8}></div>
          <span>Mínimo 8 caracteres</span>
        </div>
      </div>
      
      <div class="form-field">
        <label for="confirm-password">Confirmar contraseña</label>
        <div class="password-input-container">
          <input 
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Confirme su nueva contraseña"
            required
          />
          <button 
            type="button" 
            class="password-toggle" 
            on:click={() => togglePasswordVisibility('confirm')}
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {#if showConfirmPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
        <div class="password-hint">
          <div class="hint-dot" class:active={newPassword === confirmPassword && newPassword !== ''}></div>
          <span>Las contraseñas coinciden</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="security-tips">
    <h3>Consejos de seguridad</h3>
    <ul>
      <li>Utiliza una combinación de letras, números y símbolos</li>
      <li>No uses la misma contraseña que en otros sitios</li>
      <li>Evita información personal fácil de adivinar</li>
    </ul>
  </div>
</ProfilePage>

<style>
  .app-container {
    padding: var(--spacing-md);
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    margin-bottom: var(--spacing-md);
  }
  
  .app-header h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    text-align: center;
    flex: 1;
    color: var(--text-primary);
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
  
  .password-icon-container {
    display: flex;
    justify-content: center;
    margin: var(--spacing-md) 0;
  }
  
  .password-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(58, 102, 255, 0.2);
  }
  
  .form-card {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .form-fields {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
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
  
  .password-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .password-input-container input {
    width: 100%;
    padding: 12px 40px 12px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    background: var(--surface-variant);
    color: var(--text-primary);
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .password-input-container input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(58, 102, 255, 0.1);
  }
  
  .password-toggle {
    position: absolute;
    right: 10px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;
  }
  
  .password-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--primary-color);
  }
  
  .password-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  
  .hint-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
    opacity: 0.4;
    transition: all 0.2s;
  }
  
  .hint-dot.active {
    background: var(--success-color);
    opacity: 1;
  }
  
  .security-tips {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-md);
    border-left: 3px solid var(--primary-color);
  }
  
  .security-tips h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
  }
  
  .security-tips ul {
    margin: 0;
    padding-left: var(--spacing-lg);
  }
  
  .security-tips li {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @media (max-width: 600px) {
    .app-container {
      padding: var(--spacing-sm);
    }
  }
</style> 