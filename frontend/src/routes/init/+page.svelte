<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import { APP_CONFIG } from '$lib/config';
  import {
      CreditCard,
      LogIn,
      Shield,
      UserPlus,
      Users,
      Zap
  } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import BlankLayout from '$lib/components/layouts/BlankLayout.svelte';
  
  // Lista de características del producto con descripciones más detalladas
  const features = [
    {
      icon: Shield,
      title: 'Seguridad garantizada',
      description: 'Todas tus transacciones protegidas con cifrado de extremo a extremo. Tu información siempre segura.'
    },
    {
      icon: Zap,
      title: 'Transacciones instantáneas',
      description: 'Realiza pagos y transferencias en tiempo real. Sin esperas, sin complicaciones.'
    },
    {
      icon: Users,
      title: 'Gestión de equipos',
      description: 'Administra permisos para cada miembro de tu equipo. Control total sobre quién hace qué.'
    },
    {
      icon: CreditCard,
      title: 'Múltiples formas de pago',
      description: 'Acepta tarjetas, transferencias y otros métodos de pago. Flexibilidad para tu negocio.'
    }
  ];
  
  // Posición actual del carrusel de características
  let currentFeature = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let autoRotateInterval: ReturnType<typeof setInterval>;

  // Avanzar o retroceder en el carrusel de características
  function changeFeature(direction: 'next' | 'prev'): void {
    if (direction === 'next') {
      currentFeature = (currentFeature + 1) % features.length;
    } else {
      currentFeature = (currentFeature - 1 + features.length) % features.length;
    }
  }

  // Manejar eventos táctiles para el carrusel
  function handleTouchStart(e: TouchEvent): void {
    touchStartX = e.touches[0].clientX;
    // Pausar rotación automática al interactuar
    clearInterval(autoRotateInterval);
  }

  function handleTouchEnd(e: TouchEvent): void {
    touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) {
      changeFeature('next');
    } else if (touchEndX - touchStartX > 50) {
      changeFeature('prev');
    }
    // Reanudar rotación automática después de interacción
    startAutoRotate();
  }
  
  // Función para iniciar rotación automática
  function startAutoRotate(): void {
    // Limpiar intervalo existente si hay uno
    if (autoRotateInterval) clearInterval(autoRotateInterval);
    
    // Crear nuevo intervalo
    autoRotateInterval = setInterval(() => {
      changeFeature('next');
    }, 4000); // Cambiar cada 4 segundos
  }
  
  // Estado para la barra de progreso de inicio
  let progress = 0;
  let splashComplete = false;
  
  onMount(() => {
    // Simulación de carga de splash screen
    const interval = setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          splashComplete = true;
          // Iniciar rotación automática cuando se complete la carga
          startAutoRotate();
        }, 200);
      }
    }, 20);
    
    return () => {
      clearInterval(interval);
      clearInterval(autoRotateInterval);
    };
  });
  
  // Navegación a otras páginas
  function goToLogin() {
    goto('/auth/login');
  }
  
  function goToRegister() {
    goto('/auth/register');
  }
  
  function goToSupport() {
    goto('/support');
  }
</script>

<svelte:head>
  <title>{APP_CONFIG.appName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#3A66FF" />
</svelte:head>

<BlankLayout title={APP_CONFIG.appName} showBack={false}>
  {#if !splashComplete}
    <!-- Splash Screen -->
    <div class="splash-screen">
      <div class="splash-logo">
        <img src="/favicon.png" alt="Logo" width="80" />
      </div>
      <h1 class="app-name">{APP_CONFIG.appName}</h1>
      <div class="progress-container">
        <div class="progress-bar" style="width: {progress}%"></div>
      </div>
    </div>
  {:else}
    <!-- App Onboarding UI -->
    <div class="mobile-app">
      <!-- Carrusel de características -->
      <div 
        class="feature-carousel" 
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
        in:fly={{ y: 32, duration: 500, delay: 80 }}
      >
        <div class="carousel-track" style="transform: translateX(-{currentFeature * 100}%)">
          {#each features as feature, i}
            <div class="carousel-item" class:active={i === currentFeature}
              in:fly={{ y: 24, duration: 400, delay: 120 + i * 80 }}
            >
              <div class="feature-icon">
                <svelte:component this={feature.icon} size={32} />
              </div>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </div>
          {/each}
        </div>
        <!-- Indicadores de paginación -->
        <div class="carousel-indicators"
          in:fly={{ y: 16, duration: 400, delay: 400 }}
        >
          {#each features as _, i}
            <div 
              class="indicator" 
              class:active={i === currentFeature}
              on:click={() => {
                currentFeature = i;
                clearInterval(autoRotateInterval);
                startAutoRotate();
              }}
            ></div>
          {/each}
        </div>
      </div>
      <!-- Área de acciones -->
      <div class="action-area"
        in:fly={{ y: 24, duration: 400, delay: 600 }}
      >
        <Button variant="primary" fullWidth on:click={goToRegister} icon={UserPlus}
        >
          Solicitar cuenta ahora
        </Button>
        <Button variant="secondary" fullWidth on:click={goToLogin} icon={LogIn}
        >
          Ya tengo cuenta
        </Button>
        <Button variant="ghost" fullWidth on:click={goToSupport}
        >
          ¿Necesitas más información?
        </Button>
      </div>
      <!-- Pie de página de la app -->
      <div class="app-footer"
        in:fly={{ y: 12, duration: 400, delay: 1100 }}
      >
        <div class="app-version">{APP_CONFIG.version}</div>
        <div class="app-copyright">&copy; {APP_CONFIG.copyrightYear}</div>
      </div>
    </div>
  {/if}
</BlankLayout>

<style>

  /* Splash Screen */
  .splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .splash-logo {
    animation: pulse 2s infinite;
    margin-bottom: var(--spacing-md);
  }
  
  .app-name {
    color: white;
    font-weight: 700;
    font-size: 2.25rem;
    margin-bottom: var(--spacing-lg);
    letter-spacing: -0.03em;
  }
  
  .progress-container {
    width: 200px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--border-radius-full);
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: white;
    border-radius: var(--border-radius-full);
    transition: width 0.2s ease;
  }
  
  /* App UI principal */
  .mobile-app {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--background);
    overflow: hidden;
    animation: fadeIn 0.3s ease-out;
  }
  
  /* Carrusel de características */
  .feature-carousel {
    flex: 1;
    overflow: hidden;
    position: relative;
    padding: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .carousel-track {
    display: flex;
    width: 100%;
    height: 70%;
    transition: transform 0.3s ease-out;
  }
  
  .carousel-item {
    min-width: 100%;
    padding: 0 var(--spacing-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    opacity: 0.5;
    transition: opacity 0.3s ease;
    flex-shrink: 0;
  }
  
  .carousel-item.active {
    opacity: 1;
  }
  
  .carousel-item h2 {
    font-size: 1.5rem;
    margin: var(--spacing-md) 0;
    color: var(--text-primary);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  
  .carousel-item p {
    font-size: 1rem;
    color: var(--text-secondary);
    line-height: 1.6;
    max-width: 280px;
    font-weight: 400;
  }
  
  .feature-icon {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-bottom: var(--spacing-md);
    box-shadow: 0 8px 16px rgba(58, 102, 255, 0.2);
  }
  
  .carousel-indicators {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding: var(--spacing-md);
  }
  
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--border-color);
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .indicator.active {
    width: 24px;
    background-color: var(--primary-color);
    border-radius: 4px;
  }
  
  /* Área de botones de acción */
  .action-area {
    padding: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  /* Pie de página de la app */
  .app-footer {
    padding: var(--spacing-md);
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
    background-color: var(--surface);
  }
  
  /* Animaciones */
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Ajustes para diferentes tamaños de pantalla */
  @media (min-height: 700px) {
    .carousel-item {
      padding: 0 var(--spacing-xl);
    }
    
    .feature-icon {
      width: 88px;
      height: 88px;
    }
    
    .carousel-item h2 {
      font-size: 1.75rem;
    }
    
    .carousel-item p {
      font-size: 1.1rem;
    }
  }
  
  @media (max-height: 600px) {
    .feature-carousel {
      padding: var(--spacing-md) var(--spacing-sm);
    }
    
    .carousel-item h2 {
      font-size: 1.25rem;
      margin: var(--spacing-xs) 0;
    }
    
    .carousel-item p {
      font-size: 0.9rem;
    }
    
    .feature-icon {
      width: 60px;
      height: 60px;
    }
    
    .action-area {
      padding: var(--spacing-md);
    }
    
    .primary-button, .secondary-button {
      height: 48px;
    }
  }
</style> 