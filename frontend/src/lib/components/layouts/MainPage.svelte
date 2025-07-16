<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    BarChart3,
    Home,
    QrCode,
    Settings
  } from '@lucide/svelte';

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
  
  // Determinar si la página actual es una página secundaria
  $: isSecondaryPage = currentPath.includes('/editar-perfil') || 
                       currentPath.includes('/cambiar-clave') || 
                       currentPath.split('/').length > 2;
</script>

<div class="main-page-wrapper">
  <slot />
  
  <!-- Navegación móvil inferior (solo en páginas principales) -->
  {#if !isSecondaryPage}
    <nav class="mobile-nav">
      {#each navItems as item}
        <button 
          class="mobile-nav-item {currentPath === item.path ? 'active' : ''}" 
          on:click={() => navigateTo(item.path)}
          aria-label={item.label}
        >
          <span class="mobile-nav-icon">
            <svelte:component this={item.icon} size={18}  />
          </span>
          <span class="mobile-nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>
  {/if}
</div>

<style>
.main-page-wrapper {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--background);
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

/* Móvil - Bottom Navigation estilo Flutter */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem 0.25rem;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  box-shadow: 
    0 -4px 20px rgba(0, 0, 0, 0.08),
    0 -1px 3px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--border-color);
  z-index: 100;
  /* transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideUpBottomNav 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); */
}

@keyframes slideUpBottomNav {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.5rem;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0.75rem;
  position: relative;
  min-width: 3.5rem;
  min-height: 3rem;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* animation: fadeInNavItem 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; */
}

.mobile-nav-item:nth-child(1) { animation-delay: 0.1s; }
.mobile-nav-item:nth-child(2) { animation-delay: 0.15s; }
.mobile-nav-item:nth-child(3) { animation-delay: 0.2s; }
.mobile-nav-item:nth-child(4) { animation-delay: 0.25s; }

@keyframes fadeInNavItem {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.mobile-nav-item:hover {
  background: rgba(58, 102, 255, 0.08);
  color: var(--primary-color);
}

.mobile-nav-item.active {
  color: var(--primary-color);
  background: rgba(58, 102, 255, 0.12);
}

/* Indicador deslizante */
.mobile-nav-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 2rem;
  height: 0.25rem;
  background: var(--primary-color);
  border-radius: 0.125rem;
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: center;
  opacity: 0;
}

.mobile-nav-item.active::before {
  transform: translateX(-50%) scaleX(1);
  opacity: 1;
}

/* Efecto de onda al hacer clic */
.mobile-nav-item::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(58, 102, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.mobile-nav-item:active::after {
  width: 3rem;
  height: 3rem;
  opacity: 1;
}

.mobile-nav-icon {
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.mobile-nav-item.active .mobile-nav-icon {
  transform: scale(1.1);
}

.mobile-nav-label {
  font-weight: 600;
  font-size: 0.625rem;
  letter-spacing: 0.025em;
  text-align: center;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}
</style> 