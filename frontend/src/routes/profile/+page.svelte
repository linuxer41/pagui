<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { theme } from '$lib/stores/theme';
  import { lang } from '$lib/stores/lang';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
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
    LogOut,
    Code
  } from '@lucide/svelte';

  // Idiomas disponibles
  const languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' }
  ];

  function handleThemeToggle() {
    theme.toggle();
  }
  

  
  function handleLogout() {
    auth.logout();
    goto('/auth/login');
  }
  
  // Datos de ejemplo del usuario (normalmente vendrían de la API)
  const userProfile = {
    name: $auth.user?.fullName || 'Usuario',
    email: $auth.user?.email || 'usuario@ejemplo.com',
    phone: '+591 77712345',
    role: $auth.user?.role || 'Usuario',
    lastLogin: new Date().toISOString(),
    memberSince: '2023-01-15T10:30:00',
    avatarUrl: null as string | null
  };

  // Referencia al input file oculto
  let fileInput: HTMLInputElement | undefined;

  // Función para abrir el selector de imagen
  function openImageUpload() {
    if (fileInput) {
      fileInput.click();
    }
  }

  // Función para manejar la selección de imagen
  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Aquí puedes implementar la lógica para subir la imagen
      // Por ahora solo creamos una URL temporal para mostrar
      const imageUrl = URL.createObjectURL(file);
      userProfile.avatarUrl = imageUrl;
      
      // Limpiar el input
      target.value = '';
    }
  }
  
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

<RouteLayout title="Mi Cuenta">
  <div class="profile-card">
    <div class="profile-info-container">
      <div class="profile-avatar" on:click={openImageUpload}>
        <div class="avatar-inner">
          {#if userProfile.avatarUrl}
            <img src={userProfile.avatarUrl} alt="Avatar de {userProfile.name}" />
          {:else}
            {userProfile.name.charAt(0).toUpperCase()}
          {/if}
        </div>
        <div class="avatar-upload-overlay">
          <span class="upload-icon">📷</span>
        </div>
      </div>
      
      <div class="profile-info">
        <h1 class="profile-name">{userProfile.name}</h1>
        <div class="profile-badge">
          <span class="badge-icon">👤</span>
          <span class="badge-text">{userProfile.role}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="action-cards">
    <!-- Información personal -->
    <button class="action-card" on:click={() => goto('/profile/account-details')} aria-label="Ver detalles de la cuenta">
      <div class="action-card-icon user">
        <User size={20} />
      </div>
      <div class="action-card-content">
        <h3>Información personal</h3>
        <p>Ver y editar detalles de tu cuenta</p>
      </div>
      <div class="action-card-arrow">
        <ChevronRight size={18} />
      </div>
    </button>
    
    <!-- Métodos de pago -->
    <button class="action-card" on:click={() => goto('/payment-methods')} aria-label="Gestionar métodos de pago">
      <div class="action-card-icon payment">
        <CreditCard size={20} />
      </div>
      <div class="action-card-content">
        <h3>Métodos de retiro</h3>
        <p>Configura a qué bancos retirar tu dinero</p>
      </div>
      <div class="action-card-arrow">
        <ChevronRight size={18} />
      </div>
    </button>
  </div>
  
  <!-- Sección de Seguridad -->
  <div class="security-section">
    <h2>Seguridad</h2>
    
    <!-- Cambiar contraseña -->
    <button class="security-card" on:click={() => goto('/profile/cambiar-clave')} aria-label="Cambiar contraseña">
      <div class="security-card-icon password">
        <Key size={20} />
      </div>
      <div class="security-card-content">
        <h3>Cambiar contraseña</h3>
        <p>Actualiza tu contraseña de acceso</p>
      </div>
      <div class="security-card-arrow">
        <ChevronRight size={18} />
      </div>
    </button>
    
    <!-- API Keys -->
    <button class="security-card" on:click={() => goto('/profile/api-keys')} aria-label="Gestionar API Keys">
      <div class="security-card-icon api">
        <Code size={20} />
      </div>
      <div class="security-card-content">
        <h3>API Keys</h3>
        <p>Gestiona tus claves de integración</p>
      </div>
      <div class="security-card-arrow">
        <ChevronRight size={18} />
      </div>
    </button>

    <!-- Métodos de Pago -->
    <button class="security-card" on:click={() => goto('/payment-methods')} aria-label="Gestionar métodos de pago">
      <div class="security-card-icon payment">
        <CreditCard size={20} />
      </div>
      <div class="security-card-content">
        <h3>Métodos de Pago</h3>
        <p>Gestiona tus cuentas y tarjetas</p>
      </div>
      <div class="security-card-arrow">
        <ChevronRight size={18} />
      </div>
    </button>
  </div>
  
  <div class="settings-section">
    <h2>Preferencias</h2>
    
    <!-- Tema -->
    <button class="settings-item" on:click={handleThemeToggle} aria-label="Cambiar tema">
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
    </button>
    
    <!-- Idioma -->
    <div class="settings-item" role="group" aria-labelledby="language-heading">
      <div class="settings-item-icon language">
        <Globe size={18} />
      </div>
      <div class="settings-item-content">
        <h3 id="language-heading">Idioma</h3>
        <p>Selecciona tu idioma preferido</p>
      </div>
      <div class="settings-item-action language-chips">
        <button 
          class="language-chip active" 
          aria-pressed="true"
          aria-label="Español"
        >
          ES
        </button>
        <button 
          class="language-chip disabled" 
          disabled
          aria-pressed="false"
          aria-label="English (próximamente)"
        >
          EN
        </button>
      </div>
    </div>
  </div>
  
  <div class="app-footer">
    <div class="footer-links">
      <button class="footer-link" on:click={() => goto('/support')}>
        Soporte
      </button>
      <span class="footer-divider">•</span>
      <button class="footer-link" on:click={() => goto('/terms')}>
        Términos
      </button>
      <span class="footer-divider">•</span>
      <button class="footer-link" on:click={() => goto('/privacy')}>
        Privacidad
      </button>
    </div>
    
    <div class="logout-container">
      <Button
        on:click={handleLogout}
        icon={LogOut}
        variant="ghost"
        fullWidth={false}
        size="lg"
      >
        Cerrar sesión
      </Button>
    </div>
    
    <div class="app-version">
      <p>Pagui • Versión 1.0.0</p>
    </div>
  </div>

  <!-- Input file oculto para subir imagen -->
  <input
    type="file"
    bind:this={fileInput}
    accept="image/*"
    on:change={handleImageUpload}
    style="display: none;"
  />
</RouteLayout>

<style>

  
  .profile-card {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-xl) var(--spacing-lg);
    background: var(--surface);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    color: var(--text-primary);
    position: relative;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: var(--spacing-lg);
    overflow: hidden;
  }
  

  
  .profile-info-container {
    display: flex;
    align-items: center;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    padding: 4px;
    margin-right: var(--spacing-xl);
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    position: relative;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  
  .profile-avatar:hover {
    transform: scale(1.05);
  }
  
  .profile-avatar:hover .avatar-upload-overlay {
    opacity: 1;
  }
  
  .avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--background);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .avatar-inner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  .avatar-upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  
  .upload-icon {
    font-size: 1.5rem;
    color: white;
  }
  
  .profile-info {
    flex: 1;
    overflow: hidden;
  }
  
  .profile-name {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
  }
  

  
  .profile-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    color: white;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(58, 102, 255, 0.3);
  }
  
  .badge-icon {
    font-size: 0.9rem;
  }
  
  .badge-text {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .profile-stats {
    display: flex;
    gap: var(--spacing-xl);
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .stat-value {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 600;
  }
  
  .action-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .action-card {
    display: flex;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    width: 100%;
    text-align: left;
    margin-bottom: var(--spacing-xs);
  }
  
  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    background: var(--surface-hover);
  }
  
    .action-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-lg);
    flex-shrink: 0;
    transition: transform 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
  
  .action-card:hover .action-card-icon {
    transform: scale(1.05);
  }
  
  .action-card-icon.user {
    background: linear-gradient(135deg, rgba(58, 102, 255, 0.2), rgba(58, 102, 255, 0.1));
    color: var(--primary-color);
  }
  
  .action-card-icon.payment {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
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
  
  .security-section {
    margin-top: var(--spacing-md);
  }
  
  .security-section h2, .settings-section h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    padding-left: var(--spacing-xs);
  }
  
  .security-card {
    display: flex;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: var(--spacing-sm);
    border: none;
    width: 100%;
    text-align: left;
  }
  
  .security-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    background: var(--surface-hover);
  }
  
  .security-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-lg);
    flex-shrink: 0;
    transition: transform 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
  
  .security-card:hover .security-card-icon {
    transform: scale(1.05);
  }
  
  .security-card-icon.password {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
    color: #f59e0b;
  }
  
  .security-card-icon.api {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1));
    color: #06b6d4;
  }
  
  .security-card-icon.payment {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
    color: #3b82f6;
  }
  
  .security-card-content {
    flex: 1;
  }
  
  .security-card-content h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 2px 0;
    color: var(--text-primary);
  }
  
  .security-card-content p {
    font-size: 0.85rem;
    margin: 0;
    color: var(--text-secondary);
  }
  
  .security-card-arrow {
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .settings-section {
    margin-top: var(--spacing-md);
  }
  
  .settings-item {
    display: flex;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    width: 100%;
    text-align: left;
  }
  
  .settings-item:hover {
    background: var(--surface-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .settings-item-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-lg);
    flex-shrink: 0;
    transition: transform 0.3s ease;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.05);
  }
  
  .settings-item:hover .settings-item-icon {
    transform: scale(1.05);
  }
  
  .settings-item-icon.theme {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
    color: #8b5cf6;
  }
  
  .settings-item-icon.language {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
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
  
  .language-chips {
    display: flex;
    gap: 8px;
  }
  
  .language-chip {
    min-width: 40px;
    height: 32px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    padding: 0 12px;
  }
  
  .language-chip.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 6px rgba(58, 102, 255, 0.2);
  }
  
  .language-chip.active:hover {
    background: var(--primary-dark);
    box-shadow: 0 2px 8px rgba(58, 102, 255, 0.3);
  }
  
  .language-chip.disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .theme-toggle {
    width: 48px;
    height: 26px;
    background: #e2e8f0;
    border-radius: 13px;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .theme-toggle.active {
    background: var(--primary-color);
  }
  
  .toggle-handle {
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
  
  .theme-toggle.active .toggle-handle {
    transform: translateX(22px);
  }
  
  .settings-item:hover .theme-toggle {
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.15);
  }
  
  .settings-item:hover .toggle-handle {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  }
  
  .app-footer {
    margin-top: auto;
    padding-top: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-lg);
    margin-top: var(--spacing-xl);
  }
  
  .footer-links {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: var(--spacing-md);
    gap: var(--spacing-xs);
  }
  
  .footer-link {
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 0.9rem;
    padding: 0.5rem;
    cursor: pointer;
    transition: color 0.2s ease;
    font-weight: 500;
  }
  
  .footer-link:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }
  
    .footer-divider {
    color: var(--text-tertiary);
    font-size: 0.8rem;
  }
  
  .logout-container {
    display: flex;
    justify-content: center;
    margin: 0 auto;
  }
  
  .app-version {
    font-size: 0.8rem;
    color: var(--text-secondary);
    opacity: 0.7;
    text-align: center;
    margin-top: var(--spacing-sm);
  }
  
  .app-version p {
    margin: 0;
  }
  

</style> 