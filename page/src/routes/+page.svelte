<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    CreditCardIcon, 
    SmartphoneIcon, 
    ZapIcon, 
    DollarSignIcon,
    GridIcon,
    ShieldIcon,
    BellIcon,
    BarChart2Icon,
    TabletIcon,
    HeadphonesIcon,
    SendIcon,
    UsersIcon
  } from 'svelte-feather-icons';
  
  import FeatureCard from '$lib/components/FeatureCard.svelte';
  import PricingCard from '$lib/components/PricingCard.svelte';
  import ModernButton from '$lib/components/ModernButton.svelte';
  
  let isMenuOpen = false;
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    isMenuOpen = false;
  }
  
  // Intersection Observer para animaciones de scroll
  function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el);
    });
  }
  
  // Datos de features
  const features = [
    {
      icon: GridIcon,
      title: "Pagos QR Instantáneos",
      description: "Genera códigos QR personalizados para cobros rápidos. Escanea y paga en segundos con cualquier banco.",
      highlight: "⚡ Instantáneo"
    },
    {
      icon: DollarSignIcon,
      title: "Transferencias Bancarias",
      description: "Recibe transferencias directas a tu cuenta. Integración con todos los bancos de Bolivia.",
      highlight: "🏦 Todos los bancos"
    },
    {
      icon: CreditCardIcon,
      title: "Tarjetas de Crédito/Débito",
      description: "Procesa pagos con tarjetas de forma segura. Acepta Visa, Mastercard y más.",
      highlight: "💳 Seguro"
    },
    {
      icon: BellIcon,
      title: "Notificaciones en Tiempo Real",
      description: "Recibe alertas instantáneas de cada cobro. Nunca más pierdas una recaudación.",
      highlight: "🔔 En vivo"
    },
    {
      icon: BarChart2Icon,
      title: "Reportes Detallados",
      description: "Analiza tus recaudaciones con gráficos y estadísticas. Exporta reportes para tu contabilidad.",
      highlight: "📊 Análisis completo"
    },
    {
      icon: ShieldIcon,
      title: "Seguridad Bancaria",
      description: "Encriptación de nivel bancario. Tus datos y transacciones están completamente protegidos.",
      highlight: "🔒 Protegido"
    },
    {
      icon: TabletIcon,
      title: "App Móvil Completa",
      description: "Gestiona todo desde tu celular. Disponible para iOS y Android con todas las funciones.",
      highlight: "📱 Móvil"
    },
    {
      icon: UsersIcon,
      title: "Múltiples Usuarios",
      description: "Comparte acceso con tu equipo. Cada usuario con permisos específicos para tu negocio.",
      highlight: "👥 Equipo"
    },
    {
      icon: HeadphonesIcon,
      title: "Soporte Personalizado",
      description: "Equipo dedicado para tu negocio. Resolvemos cualquier consulta en minutos, no horas.",
      highlight: "🎯 Dedicado"
    }
  ];



  onMount(() => {
    setupScrollAnimations();
  });
</script>

<svelte:head>
  <title>Pagui - La Revolución de Pagos QR en Bolivia</title>
  <meta name="description" content="Transforma tu negocio con la plataforma de pagos QR más moderna de Bolivia. Rápido, seguro y sin comisiones ocultas.">
  <link rel="icon" type="image/png" href="/favicon.png">
</svelte:head>

<!-- Navigation -->
<nav class="navbar">
  <div class="container">
    <div class="nav-brand">
      <div class="logo">
        <div class="logo-icon">
          <img src="/favicon.png" alt="Pagui Logo" width="24" height="24">
        </div>
        <span class="logo-text">Pagui</span>
      </div>
    </div>
    
    <div class="nav-menu" class:open={isMenuOpen}>
      <a href="#inicio">Inicio</a>
      <a href="#features">Características</a>
      <a href="#pricing">Precios</a>
      <a href="#app">App</a>
      <a href="/recaudaciones" class="btn btn-outline">Iniciar Sesión</a>
      <a href="#pricing" class="btn btn-primary">Comenzar</a>
    </div>
    
    <button class="nav-toggle" on:click={toggleMenu} aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
</nav>

<!-- Hero Section -->
<section id="inicio" class="hero">
  <div class="hero-bg">
    <div class="hero-bg-gradient"></div>
    <div class="hero-bg-pattern"></div>
  </div>
  <div class="container">
    <div class="hero-content">
      <div class="hero-text">
        <div class="hero-badge">
          <SendIcon size="16" />
          <span>La plataforma de recaudaciones más completa de Bolivia</span>
        </div>
        <h1 class="hero-title">
          Recaudaciones que
          <span class="gradient-text">Impulsan</span>
          tu Negocio
        </h1>
        <p class="hero-subtitle">
          Gestiona todos tus cobros con nuestra plataforma integral de recaudaciones. 
          QR, transferencias, efectivo, tarjetas y más en una sola solución.
        </p>
        <div class="hero-actions">
          <ModernButton 
            variant="primary" 
            size="large" 
            icon={SendIcon}
            iconPosition="right"
            on:click={() => scrollToSection('app')}
          >
            Descargar App
          </ModernButton>
          <ModernButton 
            variant="ghost" 
            size="large"
            icon={SmartphoneIcon}
            iconPosition="right"
            on:click={() => scrollToSection('demo')}
          >
            Ver Demo Interactivo
          </ModernButton>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-number">50K+</div>
            <div class="stat-label">Usuarios Activos</div>
          </div>
          <div class="stat">
            <div class="stat-number">Bs. 2M+</div>
            <div class="stat-label">Transacciones</div>
          </div>
          <div class="stat">
            <div class="stat-number">99.9%</div>
            <div class="stat-label">Uptime</div>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="phone-showcase">
          <div class="phone-frame">
            <div class="phone-screen">
              <div class="app-header">
                <div class="app-logo">
                  <img src="/favicon.png" alt="Pagui Logo" width="20" height="20">
                </div>
                <div class="app-title">Pagui</div>
              </div>
              <div class="qr-section">
                <div class="qr-code">
                  <GridIcon size="60" color="white" />
                </div>
                <div class="payment-details">
                  <h3>Pago QR</h3>
                  <p>Escanea y paga</p>
                  <div class="amount">Bs. 150.00</div>
                </div>
              </div>
              <div class="app-footer">
                <div class="status">
                  <ZapIcon size="14" color="#10b981" />
                  Listo para recibir
                </div>
              </div>
            </div>
          </div>
          <div class="floating-card card-1">
            <div class="card-icon success">
              <DollarSignIcon size="20" />
            </div>
            <div class="card-text">Pago Recibido</div>
          </div>
          <div class="floating-card card-2">
            <div class="card-icon warning">
              <ZapIcon size="20" />
            </div>
            <div class="card-text">Instantáneo</div>
          </div>
          <div class="floating-card card-3">
            <div class="card-icon primary">
              <ShieldIcon size="20" />
            </div>
            <div class="card-text">Seguro</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="features">
  <div class="container">
    <div class="section-header fade-in">
      <div class="section-badge">🚀 Plataforma Completa</div>
      <h2 class="section-title">La solución integral para todas tus recaudaciones</h2>
      <p class="section-subtitle">
        No solo QR, sino una plataforma completa que centraliza todos tus métodos de cobro en un solo lugar
      </p>
    </div>
    
    <div class="features-grid">
      {#each features as feature, index}
        <FeatureCard
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          highlight={feature.highlight}
          delay={index * 100}
          on:click={(e) => console.log('Feature clicked:', e.detail)}
        />
      {/each}
    </div>
  </div>
</section>

<!-- Pricing Section -->
<section id="pricing" class="pricing">
  <div class="container">
    <div class="section-header fade-in">
      <div class="section-badge">💰 Precios Simples</div>
      <h2 class="section-title">Usa la app, crea cuenta y vincúlate sin costo</h2>
      <p class="section-subtitle">
        Solo cobramos cuando empiezas a generar ganancias con una mínima comisión por transacción
      </p>
    </div>
    
    <div class="pricing-info fade-in">
      <div class="pricing-step">
        <div class="step-icon">📱</div>
        <h3>1. Descarga la App</h3>
        <p>Descarga nuestra aplicación móvil desde App Store o Google Play</p>
      </div>
      
      <div class="pricing-step">
        <div class="step-icon">✅</div>
        <h3>2. Crea tu Cuenta</h3>
        <p>Regístrate gratis en menos de 2 minutos con tu información básica</p>
      </div>
      
      <div class="pricing-step">
        <div class="step-icon">🔗</div>
        <h3>3. Vincúlate</h3>
        <p>Conecta tu cuenta bancaria sin ningún costo de vinculación</p>
      </div>
      
      <div class="pricing-step">
        <div class="step-icon">💰</div>
        <h3>4. Comienza a Ganar</h3>
        <p>Empieza a recibir pagos inmediatamente. Solo pagas una pequeña comisión por transacción exitosa</p>
      </div>
    </div>
    
    <div class="pricing-highlight fade-in">
      <div class="highlight-icon">💡</div>
      <div class="highlight-content">
        <h4>Comisión Flexible</h4>
        <p>Nuestra comisión es muy baja y flexible. Cuanto más volumen manejes, mejores tarifas tendrás. Habla con nuestro equipo de ventas para obtener las mejores condiciones para tu negocio.</p>
        <div class="highlight-cta">
          <a href="https://wa.me/59175434250" target="_blank" class="whatsapp-btn">
            <span>💬 Hablar con Ventas</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- App Download Section -->
<section id="app" class="app-section">
  <div class="container">
    <div class="app-content">
      <div class="app-text">
        <div class="section-badge">
          <SmartphoneIcon size="16" />
          App Móvil
        </div>
        <h2>Descarga Nuestra App</h2>
        <p class="app-subtitle">Gestiona tus recaudaciones desde cualquier lugar con nuestra aplicación móvil. Disponible para iOS y Android.</p>
        <div class="app-features">
          <div class="app-feature">
            <div class="feature-icon">
              <ZapIcon size="20" color="#f59e0b" />
            </div>
            <span>Recaudaciones instantáneas</span>
          </div>
          <div class="app-feature">
            <div class="feature-icon">
              <ShieldIcon size="20" color="#10b981" />
            </div>
            <span>Seguridad bancaria</span>
          </div>
          <div class="app-feature">
            <div class="feature-icon">
              <BarChart2Icon size="20" color="#3b82f6" />
            </div>
            <span>Reportes de cobros</span>
          </div>
        </div>
        <div class="app-downloads">
          <a href="#" class="download-btn">
            <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="App Store">
          </a>
          <a href="#" class="download-btn">
            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Google Play">
          </a>
        </div>
      </div>
      <div class="app-visual">
        <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" alt="Mobile App" class="app-image">
      </div>
    </div>
  </div>
</section>



<!-- Footer -->
<footer class="footer">
  <div class="container">
    <div class="footer-content">
      <div class="footer-brand">
        <div class="logo">
          <div class="logo-icon">
            <img src="/favicon.png" alt="Pagui Logo" width="24" height="24">
          </div>
          <span class="logo-text">Pagui</span>
        </div>
        <p>La plataforma de recaudaciones más completa de Bolivia</p>
      </div>
      <div class="footer-links">
        <div class="footer-column">
          <h4>Producto</h4>
          <a href="#features">Características</a>
          <a href="#pricing">Precios</a>
          <a href="#app">App Móvil</a>
        </div>
        <div class="footer-column">
          <h4>Empresa</h4>
          <a href="#pricing">Precios</a>
          <a href="/recaudaciones">Recaudaciones</a>
          <a href="https://wa.me/59175434250" target="_blank">Contacto</a>
        </div>
        <div class="footer-column">
          <h4>Soporte</h4>
          <a href="#">Centro de Ayuda</a>
          <a href="#">Documentación</a>
          <a href="#">Estado del Servicio</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 Pagui. Todos los derechos reservados.</p>
    </div>
  </div>
</footer>

<style>
  /* Reset and base styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: rgb(var(--gray-900));
    background: rgb(var(--gray-50));
    overflow-x: hidden;
  }
  
  /* Container */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-lg);
  }
  
  /* Navigation */
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(var(--gray-200), 0.5);
    z-index: 1000;
    padding: var(--space) 0;
  }
  
  .navbar .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .logo-icon img {
    border-radius: 6px;
    object-fit: cover;
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .nav-menu {
    display: flex;
    align-items: center;
    gap: var(--space-xl);
  }
  
  .nav-menu a {
    text-decoration: none;
    color: rgb(var(--gray-700));
    font-weight: 500;
    transition: color 0.3s ease;
  }
  
  .nav-menu a:hover {
    color: rgb(var(--primary));
  }
  
  .nav-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    flex-direction: column;
    gap: 4px;
  }
  
  .nav-toggle span {
    width: 25px;
    height: 3px;
    background: rgb(var(--gray-700));
    transition: 0.3s;
  }
  
  /* Hero Section */
  .hero {
    padding: calc(80px + var(--space-xl)) 0 var(--space-xl);
    position: relative;
    overflow: hidden;
    min-height: 85vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, rgba(var(--primary), 0.02) 0%, rgba(var(--purple), 0.02) 100%);
  }
  
  .hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
  
  .hero-bg-gradient {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgb(var(--primary-500)) 0%, rgb(var(--purple-500)) 100%);
    opacity: 0.1;
  }
  
  .hero-bg-pattern {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 25% 25%, rgba(var(--primary-500), 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 75% 75%, rgba(var(--purple-500), 0.1) 0%, transparent 50%);
  }
  
  .hero-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xl);
    align-items: center;
  }
  
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    background: rgba(var(--primary), 0.1);
    color: rgb(var(--primary-dark));
    padding: var(--space-xs) var(--space-xs);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: var(--space);
  }
  
  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: fadeInUp 1s ease-out 0.3s both;
  }
  
  .gradient-text {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
    color: rgb(var(--gray-600));
    margin-bottom: var(--space-lg);
    line-height: 1.6;
    animation: fadeInUp 1s ease-out 0.6s both;
  }
  
  .hero-actions {
    display: flex;
    gap: var(--space);
    margin-bottom: var(--space-xl);
    animation: fadeInUp 1s ease-out 0.9s both;
  }
  
  .hero-actions :global(.modern-button) {
    min-width: 200px;
    justify-content: center;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .btn-primary {
    background: var(--gradient-primary);
    color: white;
    position: relative;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 15px rgba(var(--primary), 0.3);
  }
  
  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(var(--primary), 0.4);
  }
  
  .btn-primary:hover::before {
    left: 100%;
  }
  
  .btn-ghost {
    background: rgba(var(--gray-100), 0.5);
    color: rgb(var(--gray-700));
    border: 1px solid rgba(var(--gray-300), 0.5);
    backdrop-filter: blur(10px);
  }
  
  .btn-ghost:hover {
    background: rgba(var(--gray-200), 0.8);
    border-color: rgb(var(--gray-400));
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(var(--gray-400), 0.2);
  }
  
  .btn-large {
    padding: var(--space) var(--space-lg);
    font-size: 1rem;
  }
  
  .hero-stats {
    display: flex;
    gap: var(--space-xl);
    animation: fadeInUp 1s ease-out 1.2s both;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgb(var(--primary));
    display: block;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: rgb(var(--gray-600));
    margin-top: var(--space-xs);
  }
  
  /* Phone Showcase */
  .phone-showcase {
    position: relative;
    display: flex;
    justify-content: center;
  }
  
  .phone-frame {
    width: 280px;
    height: 560px;
    background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
    border-radius: 40px;
    padding: 8px;
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.3),
      0 10px 20px rgba(0, 0, 0, 0.2);
    position: relative;
    animation: float 6s ease-in-out infinite;
  }
  
  .phone-screen {
    width: 100%;
    height: 100%;
    background: white;
    border-radius: 32px;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .app-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding-bottom: var(--space);
    border-bottom: 1px solid rgb(var(--gray-200));
  }
  
  .app-logo {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .app-logo img {
    border-radius: 4px;
    object-fit: cover;
  }
  
  .app-title {
    font-weight: 700;
    color: rgb(var(--gray-900));
  }
  
  .qr-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
  }
  
  .qr-code {
    width: 120px;
    height: 120px;
    background: rgb(var(--gray-900));
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  
  .qr-pattern {
    width: 80px;
    height: 80px;
    background: repeating-conic-gradient(
      from 0deg,
      white 0deg 90deg,
      transparent 90deg 180deg
    );
    border-radius: var(--radius-sm);
  }
  
  .payment-details {
    text-align: center;
  }
  
  .payment-details h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--space-xs);
  }
  
  .payment-details p {
    color: rgb(var(--gray-600));
    margin-bottom: var(--space-sm);
  }
  
  .amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgb(var(--primary));
  }
  
  .app-footer {
    text-align: center;
    padding-top: var(--space);
    border-top: 1px solid rgb(var(--gray-200));
  }
  
  .status {
    font-size: 0.875rem;
    color: rgb(var(--success));
    font-weight: 500;
  }
  
  .floating-card {
    position: absolute;
    background: white;
    padding: var(--space-sm);
    border-radius: 16px;
    box-shadow: 
      0 8px 25px rgba(0, 0, 0, 0.15),
      0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    animation: float 4s ease-in-out infinite;
    border: 1px solid rgba(var(--gray-200), 0.3);
    backdrop-filter: blur(10px);
  }
  
  .card-1 {
    top: 10%;
    right: -20px;
    animation-delay: 0s;
  }
  
  .card-2 {
    bottom: 20%;
    left: -30px;
    animation-delay: 1.5s;
  }
  
  .card-3 {
    top: 50%;
    right: -40px;
    animation-delay: 3s;
  }
  
  .card-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.25rem;
  }
  
  .card-icon.success {
    background: linear-gradient(135deg, rgb(var(--success)) 0%, rgb(var(--secondary)) 100%);
    box-shadow: 0 4px 15px rgba(var(--success), 0.3);
  }
  
  .card-icon.warning {
    background: linear-gradient(135deg, rgb(var(--warning)) 0%, rgb(var(--accent)) 100%);
    box-shadow: 0 4px 15px rgba(var(--warning), 0.3);
  }
  
  .card-icon.primary {
    background: linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--purple)) 100%);
    box-shadow: 0 4px 15px rgba(var(--primary), 0.3);
  }
  
  .card-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgb(var(--gray-800));
    white-space: nowrap;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  /* Features Section */
  .features {
    padding: var(--space-2xl) 0;
    background: linear-gradient(135deg, white 0%, rgb(var(--gray-50)) 100%);
    position: relative;
  }
  
  .features::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--primary), 0.2), transparent);
  }
  
  .section-header {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }
  
  .section-badge {
    display: inline-block;
    background: rgba(var(--primary), 0.1);
    color: rgb(var(--primary-dark));
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: var(--space);
  }
  
  .section-title {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
    color: rgb(var(--gray-900));
  }
  
  .section-subtitle {
    font-size: 1.125rem;
    color: rgb(var(--gray-600));
    max-width: 600px;
    margin: 0 auto;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-xl);
    position: relative;
    z-index: 1;
  }
  
  .feature-card {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    padding: var(--space-lg);
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 1px solid rgba(var(--gray-200), 0.5);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
  }
  
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, rgb(var(--primary)), rgb(var(--purple)));
    transform: scaleX(0);
    transition: transform 0.4s ease;
  }
  
  .feature-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(var(--primary), 0.02) 0%, rgba(var(--purple), 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-12px) scale(1.02);
    box-shadow: 0 20px 40px rgba(var(--primary), 0.15);
    border-color: rgba(var(--primary-light), 0.3);
  }
  
  .feature-card:hover::before {
    transform: scaleX(1);
  }
  
  .feature-card:hover::after {
    opacity: 1;
  }
  
  .feature-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--purple)) 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-lg);
    color: white;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }
  
  .feature-icon::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .feature-card:hover .feature-icon {
    transform: scale(1.15) rotate(8deg);
    box-shadow: 0 8px 25px rgba(var(--primary), 0.3);
  }
  
  .feature-card:hover .feature-icon::before {
    opacity: 1;
  }
  
  .feature-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
    position: relative;
    z-index: 1;
  }
  
  .feature-card p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
    margin-bottom: var(--space);
    position: relative;
    z-index: 1;
  }
  
  .feature-highlight {
    display: inline-block;
    background: linear-gradient(135deg, rgba(var(--primary), 0.1) 0%, rgba(var(--purple), 0.1) 100%);
    color: rgb(var(--primary-dark));
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid rgba(var(--primary-light), 0.3);
    position: relative;
    z-index: 1;
  }
  
  /* Pricing Section */
  .pricing {
    padding: var(--space-2xl) 0;
    background: linear-gradient(135deg, rgb(var(--gray-50)) 0%, white 100%);
  }
  
  .pricing-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-xl);
    margin-bottom: var(--space-2xl);
  }
  
  .pricing-step {
    text-align: center;
    padding: var(--space-xl);
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(var(--gray-200), 0.5);
    transition: all 0.3s ease;
  }
  
  .pricing-step:hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 30px rgba(var(--primary), 0.15);
  }
  
  .step-icon {
    font-size: 3rem;
    margin-bottom: var(--space);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  
  .pricing-step h3 {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .pricing-step p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
  }
  

  

  
  .pricing-highlight {
    background: linear-gradient(135deg, rgba(var(--primary), 0.05) 0%, rgba(var(--purple), 0.05) 100%);
    border: 1px solid rgba(var(--primary-light), 0.2);
    border-radius: 20px;
    padding: var(--space-xl);
    display: flex;
    align-items: flex-start;
    gap: var(--space-lg);
    max-width: 800px;
    margin: 0 auto;
  }
  
  .highlight-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .highlight-content h4 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .highlight-content p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
    margin-bottom: var(--space-lg);
  }
  
  .highlight-cta {
    text-align: center;
  }
  
  .whatsapp-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
    color: white;
    padding: var(--space) var(--space-lg);
    border-radius: 16px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
  }
  
  .whatsapp-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
  }
  
  .note-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .note-content h4 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .note-content p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
  }
  
  /* App Section */
  .app-section {
    padding: var(--space-2xl) 0;
    background: rgb(var(--gray-50));
  }
  
  .app-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xl);
    align-items: center;
  }
  
  .app-text h2 {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .app-subtitle {
    font-size: 1rem;
    color: rgb(var(--gray-600));
    margin-bottom: var(--space-lg);
    line-height: 1.5;
  }
  
  .app-features {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }
  
  .app-feature {
    display: flex;
    align-items: center;
    gap: var(--space);
  }
  
  .app-feature .feature-icon {
    width: 35px;
    height: 35px;
    background: rgba(var(--primary), 0.1);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }
  
  .app-downloads {
    display: flex;
    gap: var(--space);
  }
  
  .download-btn img {
    height: 45px;
    transition: transform 0.3s ease;
  }
  
  .download-btn:hover img {
    transform: scale(1.05);
  }
  
  .app-image {
    width: 100%;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
  }
  
  /* Empresas Section */
  .empresas-section {
    padding: var(--space-2xl) 0;
    background: white;
  }
  
  .empresas-header {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }
  
  .empresas-header h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .empresas-header p {
    font-size: 1.125rem;
    color: rgb(var(--gray-600));
    max-width: 600px;
    margin: 0 auto;
  }
  
  .empresas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-lg);
    margin-bottom: var(--space-2xl);
  }
  
  .empresa-benefit {
    text-align: center;
    padding: var(--space);
  }
  
  .benefit-icon {
    font-size: 2.5rem;
    margin-bottom: var(--space);
  }
  
  .empresa-benefit h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .empresa-benefit p {
    color: rgb(var(--gray-600));
  }
  
  .empresas-cta {
    text-align: center;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .empresas-cta h3 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .empresas-cta p {
    font-size: 1.125rem;
    color: rgb(var(--gray-600));
    margin-bottom: var(--space-xl);
  }
  
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space);
  }
  
  .form-input,
  .form-textarea {
    padding: var(--space-sm);
    border: 2px solid rgb(var(--gray-300));
    border-radius: var(--radius-lg);
    font-size: 0.95rem;
    transition: border-color 0.3s ease;
  }
  
  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: rgb(var(--primary-500));
  }
  
  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }
  
  /* Footer */
  .footer {
    background: rgb(var(--gray-900));
    color: white;
    padding: var(--space-2xl) 0 var(--space-lg);
  }
  
  .footer-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-3xl);
    margin-bottom: var(--space-xl);
  }
  
  .footer-brand p {
    color: rgb(var(--gray-400));
    margin-top: var(--space);
  }
  
  .footer-links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xl);
  }
  
  .footer-column h4 {
    font-weight: 600;
    margin-bottom: var(--space);
  }
  
  .footer-column a {
    display: block;
    color: rgb(var(--gray-400));
    text-decoration: none;
    margin-bottom: var(--space-sm);
    transition: color 0.3s ease;
  }
  
  .footer-column a:hover {
    color: white;
  }
  
  .footer-bottom {
    border-top: 1px solid rgb(var(--gray-800));
    padding-top: var(--space-xl);
    text-align: center;
    color: rgb(var(--gray-400));
  }
  
  /* Animaciones */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float {
    0%, 100% { 
      transform: translateY(0px) rotate(0deg) scale(1); 
    }
    25% {
      transform: translateY(-15px) rotate(1deg) scale(1.02);
    }
    50% { 
      transform: translateY(-25px) rotate(2deg) scale(1.05); 
    }
    75% {
      transform: translateY(-15px) rotate(1deg) scale(1.02);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .fade-in {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease;
  }
  
  .fade-in.visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .nav-menu {
      display: none;
    }
    
    .nav-toggle {
      display: flex;
    }
    
    .hero-content {
      grid-template-columns: 1fr;
      text-align: center;
    }
    
    .hero-title {
      font-size: 2.5rem;
    }
    
    .hero-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .hero-stats {
      justify-content: center;
    }
    
    .floating-card {
      padding: var(--space-xs);
    }
    
    .card-icon {
      width: 28px;
      height: 28px;
    }
    
    .card-text {
      font-size: 0.8rem;
    }
    
    .card-3 {
      display: none;
    }
    
    .features-grid {
      grid-template-columns: 1fr;
    }
    
    .app-content {
      grid-template-columns: 1fr;
    }
    

    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .footer-content {
      grid-template-columns: 1fr;
    }
    
    .footer-links {
      grid-template-columns: 1fr;
    }
    
    .pricing-info {
      grid-template-columns: 1fr;
    }
    
    .pricing-step {
      padding: var(--space-lg);
    }
    
    .pricing-highlight {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
