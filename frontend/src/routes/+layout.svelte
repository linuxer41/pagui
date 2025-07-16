<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import { APP_CONFIG } from '$lib/config';
  import type { User } from '$lib/stores/auth';
  import { auth } from '$lib/stores/auth';
  import { theme } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  import { M3 } from "tauri-plugin-m3";
  import '../app.css';
// Importar iconos de Lucide
  import {
      BarChart3,
      Home,
      LogOut,
      QrCode,
      Settings
  } from '@lucide/svelte';
  
  // Verificar autenticación en cada cambio de ruta
  $: {
    const path = $page.url.pathname;
    
    // Si no está en la página de login y no está autenticado, redirigir a login
    if (path !== '/login' && !$auth.isAuthenticated) {
      goto('/login');
    }
    
    // Si está en login y ya está autenticado, redirigir a home
    if (path === '/login' && $auth.isAuthenticated) {
      goto('/');
    }
  }

    // Determinar si estamos en móvil o escritorio
    let isMobile = false;
  
  // Verificar token expirado
  onMount(async () => {
    
    // set is mobile
    if (window.innerWidth < 768) {
      isMobile = true;
    }



    // get insets for compensating EdgeToEdge display
    // either already scale compensated or raw
    let deviceInsets = await M3.getInsets();
    if (deviceInsets && deviceInsets.adjustedInsetTop) {
    console.log(deviceInsets.adjustedInsetTop); // f.E. 96
    }

    // Centralizar el ajuste de color de barra según el tema
    await theme.applyTheme($theme);

    // set the status and navigation bar color
    // choose either "dark", "light" or "system" (default)
    if ($auth.token) {
      try {
        // Verificar si el token está expirado
        const tokenData = JSON.parse(atob($auth.token.split('.')[1]));
        const expirationTime = tokenData.exp * 1000; // convertir a milisegundos
        
        if (Date.now() > expirationTime) {
          console.log('Token expirado, cerrando sesión...');
          auth.logout();
          goto('/login');
        }
      } catch (error) {
        console.error('Error al verificar token:', error);
        auth.logout();
        goto('/login');
      }
    }
  });
  
  // Obtener la ruta actual
  $: currentPath = $page.url.pathname;
  
  // Navegación
  const navItems = [
    { path: '/', label: 'Mi Billetera', icon: Home },
    { path: '/qr', label: 'Cobrar QR', icon: QrCode },
    { path: '/transactions', label: 'Transacciones', icon: BarChart3 },
    { path: '/profile', label: 'Mi Cuenta', icon: Settings }
  ];
  
  function navigateTo(path: string): void {
    goto(path);
  }
  
  function handleLogout(): void {
    auth.logout();
    goto('/login');
  }

  // Sidebar: usar name, si no, email
  function getUserDisplayName(user: User | null): string {
    return user?.name || user?.email || 'Usuario';
  }
  
  // Determinar si la página actual es una página secundaria
  $: isSecondaryPage = currentPath.includes('/editar-perfil') || 
                       currentPath.includes('/cambiar-clave') || 
                       currentPath.split('/').length > 2;
  

</script>


<Toast />

{#if $auth.isAuthenticated && currentPath !== '/login'}
  {#if isMobile}
    <!-- Layout para móvil -->
    <div class="fullscreen-mobile">
      <slot />
    </div>
  {:else}
    <!-- Layout para escritorio -->
    <div class="desktop-layout">
      <!-- Sidebar -->
      <aside class="desktop-sidebar">
        <div class="sidebar-header">
          <div class="logo-container">
            <img src="/favicon.png" alt="Logo" width="30" />
            <h2>{APP_CONFIG.appName}</h2>
          </div>
        </div>
        <div class="sidebar-user">
          {#if $auth.user}
            <div class="user-avatar">
              {getUserDisplayName($auth.user).charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
              <div class="user-name">{getUserDisplayName($auth.user)}</div>
              <div class="user-role">{$auth.user.role || 'Usuario'}</div>
            </div>
          {/if}
        </div>
        <div class="sidebar-divider"></div>
        <nav class="desktop-nav">
          {#each navItems as item}
            <button 
              class="desktop-nav-item {currentPath === item.path ? 'active' : ''}" 
              on:click={() => navigateTo(item.path)}
            >
              <span class="desktop-nav-icon">
                <svelte:component this={item.icon} size={18} />
              </span>
              <span>{item.label}</span>
            </button>
          {/each}
        </nav>
        
        <div class="sidebar-footer">
          <button class="logout-button" on:click={handleLogout}>
            <span class="logout-icon">
              <LogOut size={18} />
            </span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <main class="desktop-content">
        <slot />
      </main>
    </div>
  {/if}
{:else}
  <slot />
{/if}

<style>
  .desktop-layout {
    display: flex;
    min-height: 100vh;
  }
  
  .desktop-sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 220px;
    background: var(--surface);
    border-right: 1px solid var(--border-color);
    padding: var(--spacing-md);
    z-index: 10;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.03);
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-bottom: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .logo-container::after {
    display: none;
  }
  
  .sidebar-header h2 {
    font-size: 1rem;
    margin: 0;
    color: var(--text-primary);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--surface-variant);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--spacing-md);
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease;
  }
  
  .sidebar-user::before {
    display: none;
  }
  
  .user-avatar {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: var(--border-radius-full);
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 2px 6px rgba(58, 102, 255, 0.2);
  }
  
  .user-info {
    flex: 1;
    overflow: hidden;
  }
  
  .user-name {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85rem;
  }
  
  .user-role {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .sidebar-divider {
    height: 1px;
    background: var(--border-color);
    margin: 0 0 var(--spacing-sm);
    opacity: 0.6;
  }
  
  .desktop-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: var(--spacing-xs);
  }
  
  .desktop-nav-item {
    display: flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-sm);
    border-radius: var(--border-radius-md);
    color: var(--text-secondary);
    transition: all 0.2s ease;
    font-size: 0.9rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    width: 100%;
    font-weight: 500;
    position: relative;
    overflow: hidden;
    margin-bottom: 1px;
  }
  
  .desktop-nav-item:hover {
    background: var(--surface-variant);
    color: var(--primary-color);
    transform: translateX(2px);
  }
  
  .desktop-nav-item.active {
    background: var(--surface-variant);
    color: var(--primary-color);
    font-weight: 600;
    box-shadow: none;
  }
  
  .desktop-nav-item.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 70%;
    width: 3px;
    background: var(--primary-color);
    border-radius: var(--border-radius-sm);
  }
  
  .desktop-nav-icon {
    margin-right: var(--spacing-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
  }
  
  .sidebar-footer {
    margin-top: auto;
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border-color);
  }
  
  .logout-button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-sm);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--border-radius-md);
    transition: all 0.2s ease;
    text-align: left;
    margin-top: var(--spacing-xs);
  }
  
  .logout-button:hover {
    color: var(--error-color);
    background: rgba(255, 71, 87, 0.08);
  }
  
  .logout-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: var(--spacing-sm);
    min-width: 20px;
  }
  
  .desktop-content {
    margin-left: 220px;
    width: calc(100% - 220px);
    min-height: 100vh;
    padding: var(--spacing-xl);
  }
</style> 