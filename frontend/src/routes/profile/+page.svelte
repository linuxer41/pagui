<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { theme } from '$lib/stores/theme';
  import { lang } from '$lib/stores/lang';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Select from '$lib/components/Select.svelte';
  import { 
    Sun, 
    Moon, 
    Globe, 
    Key, 
    CreditCard, 
    UserCog, 
    Shield, 
    Bell,
    User,
    Mail,
    Phone,
    Calendar,
    Edit,
    ChevronRight,
    Settings,
    LogOut
  } from '@lucide/svelte';
  import MainPage from '$lib/components/layouts/MainPage.svelte';
  import ProfilePage from '$lib/components/layouts/ProfilePage.svelte';

  // Idiomas disponibles
  const languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' }
  ];

  function handleThemeToggle() {
    theme.toggle();
  }
  
  function navigateToEditProfile() {
    goto('/profile/editar-perfil');
  }
  
  function handleLogout() {
    auth.logout();
    goto('/login');
  }
  
  // Datos de ejemplo del usuario (normalmente vendrían de la API)
  const userProfile = {
    name: $auth.user?.name || 'Usuario',
    email: $auth.user?.email || 'usuario@ejemplo.com',
    phone: '+591 77712345',
    role: $auth.user?.role || 'Usuario',
    lastLogin: new Date().toISOString(),
    memberSince: '2023-01-15T10:30:00'
  };
  
  // Formatear fecha
  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
</script>

<ProfilePage title="Mi Perfil" showBack={false}>
  <div class="profile-header">
    <div class="profile-avatar">
      <div class="avatar-inner">
        {userProfile.name.charAt(0).toUpperCase()}
      </div>
    </div>
    
    <div class="profile-info">
      <h1>{userProfile.name}</h1>
      <p>{userProfile.email}</p>
    </div>
    
    <button class="edit-profile-button" on:click={navigateToEditProfile}>
      <Edit size={18} />
    </button>
  </div>

  <div class="action-cards">
    <!-- Información personal -->
    <div class="action-card" on:click={navigateToEditProfile}>
      <div class="action-card-icon user">
        <User size={20} />
      </div>
      <div class="action-card-content">
        <h3>Información personal</h3>
        <p>Edita tu perfil y datos de contacto</p>
      </div>
      <div class="action-card-arrow">
        <ChevronRight size={18} />
      </div>
    </div>
    
    <!-- Seguridad -->
    <div class="action-card" on:click={() => goto('/profile/cambiar-clave')}>
      <div class="action-card-icon security">
        <Key size={20} />
      </div>
      <div class="action-card-content">
        <h3>Seguridad</h3>
        <p>Cambia tu contraseña</p>
      </div>
      <div class="action-card-arrow">
        <ChevronRight size={18} />
      </div>
    </div>
    
    <!-- Métodos de pago -->
    <div class="action-card">
      <div class="action-card-icon payment">
        <CreditCard size={20} />
      </div>
      <div class="action-card-content">
        <h3>Métodos de pago</h3>
        <p>Gestiona tus cuentas bancarias</p>
      </div>
      <div class="action-card-arrow">
        <ChevronRight size={18} />
      </div>
    </div>
  </div>
  
  <div class="settings-section">
    <h2>Preferencias</h2>
    
    <!-- Tema -->
    <div class="settings-item" on:click={handleThemeToggle}>
      <div class="settings-item-icon theme">
        {#if $theme === 'dark'}
          <Sun size={18} />
        {:else}
          <Moon size={18} />
        {/if}
      </div>
      <div class="settings-item-content">
        <h3>Tema</h3>
        <p>{$theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}</p>
      </div>
      <div class="settings-item-action">
        <div class="theme-toggle" class:active={$theme === 'dark'}>
          <div class="toggle-handle"></div>
        </div>
      </div>
    </div>
    
    <!-- Idioma -->
    <div class="settings-item">
      <div class="settings-item-icon language">
        <Globe size={18} />
      </div>
      <div class="settings-item-content">
        <h3>Idioma</h3>
        <p>Selecciona tu idioma preferido</p>
      </div>
      <div class="settings-item-action">
        <Select 
          id="language"
          bind:value={$lang}
          options={languages}
          aria-label="Idioma"
        />
      </div>
    </div>
  </div>
  
  <div class="app-footer">
    <button class="logout-button" on:click={handleLogout}>
      <LogOut size={18} />
      <span>Cerrar sesión</span>
    </button>
    
    <div class="app-version">
      <p>Versión 1.0.0</p>
    </div>
  </div>
</ProfilePage>

<style>
  .app-container {
    padding: var(--spacing-md) var(--spacing-md) 2rem;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .profile-header {
    display: flex;
    align-items: center;
    padding: var(--spacing-lg);
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    border-radius: var(--border-radius-xl);
    color: white;
    position: relative;
    box-shadow: 0 4px 20px rgba(58, 102, 255, 0.2);
    margin-bottom: var(--spacing-md);
  }
  
  .profile-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    padding: 3px;
    margin-right: var(--spacing-md);
    flex-shrink: 0;
  }
  
  .avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: white;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .profile-info {
    flex: 1;
    overflow: hidden;
  }
  
  .profile-info h1 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .profile-info p {
    font-size: 0.9rem;
    margin: 0;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .edit-profile-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .edit-profile-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .action-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .action-card {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .action-card-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-md);
    flex-shrink: 0;
  }
  
  .action-card-icon.user {
    background: rgba(58, 102, 255, 0.1);
    color: var(--primary-color);
  }
  
  .action-card-icon.security {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  
  .action-card-icon.payment {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  
  .action-card-content {
    flex: 1;
  }
  
  .action-card-content h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 2px 0;
    color: var(--text-primary);
  }
  
  .action-card-content p {
    font-size: 0.85rem;
    margin: 0;
    color: var(--text-secondary);
  }
  
  .action-card-arrow {
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .settings-section {
    margin-top: var(--spacing-md);
  }
  
  .settings-section h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    padding-left: var(--spacing-xs);
  }
  
  .settings-item {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
  }
  
  .settings-item-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-md);
    flex-shrink: 0;
  }
  
  .settings-item-icon.theme {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }
  
  .settings-item-icon.language {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .settings-item-content {
    flex: 1;
  }
  
  .settings-item-content h3 {
    font-size: 1rem;
    font-weight: 500;
    margin: 0 0 2px 0;
    color: var(--text-primary);
  }
  
  .settings-item-content p {
    font-size: 0.85rem;
    margin: 0;
    color: var(--text-secondary);
  }
  
  .settings-item-action {
    margin-left: var(--spacing-sm);
  }
  
  .theme-toggle {
    width: 44px;
    height: 24px;
    background: #e2e8f0;
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
  }
  
  .theme-toggle.active {
    background: var(--primary-color);
  }
  
  .toggle-handle {
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
  
  .theme-toggle.active .toggle-handle {
    transform: translateX(20px);
  }
  
  .app-footer {
    margin-top: auto;
    padding-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
  }
  
  .logout-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
    border: none;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-lg);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .logout-button:hover {
    background: rgba(239, 68, 68, 0.15);
  }
  
  .app-version {
    font-size: 0.8rem;
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .app-version p {
    margin: 0;
  }
  
  @media (max-width: 600px) {
    .app-container {
      padding: var(--spacing-sm) var(--spacing-sm) 5rem;
    }
  }
</style> 