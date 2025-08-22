<script>
  import '../../lib/theme.css';
  
  // Datos mockeados del backend
  const empresas = [
    {
      id: 'empresa-a',
      nombre: 'Restaurante El Buen Sabor',
      logo: '🍽️',
      descripcion: 'Restaurante de comida tradicional boliviana',
      color: 'rgb(var(--emerald))',
      gradiente: 'var(--gradient-emerald)',
      categoria: 'Restaurante',
      ubicacion: 'La Paz, Bolivia'
    },
    {
      id: 'empresa-b',
      nombre: 'Farmacia Salud Total',
      logo: '💊',
      descripcion: 'Farmacia y productos de salud',
      color: 'rgb(var(--primary))',
      gradiente: 'var(--gradient-primary)',
      categoria: 'Farmacia',
      ubicacion: 'Cochabamba, Bolivia'
    },
    {
      id: 'empresa-c',
      nombre: 'Taller Mecánico Rápido',
      logo: '🔧',
      descripcion: 'Servicios automotrices y mantenimiento',
      color: 'rgb(var(--accent))',
      gradiente: 'var(--gradient-accent)',
      categoria: 'Automotriz',
      ubicacion: 'Santa Cruz, Bolivia'
    }
  ];
</script>

<svelte:head>
  <title>Empresas - Pagui Recaudaciones</title>
  <meta name="description" content="Encuentra tu empresa y paga tu cuenta de forma segura" />
</svelte:head>

<!-- Header -->
<header class="header" style="background: var(--gradient-hero)">
  <div class="container">
    <div class="header-content">
      <h1 class="title">Empresas Disponibles</h1>
      <p class="subtitle">Selecciona tu empresa para buscar y pagar tu cuenta</p>
    </div>
  </div>
</header>

<!-- Contenido principal -->
<main class="main-content">
  <div class="container">
    <div class="empresas-grid">
      {#each empresas as empresa}
        <a href="/recaudaciones/{empresa.id}" class="empresa-card">
          <div class="empresa-header">
            <div class="empresa-logo" style="background: {empresa.color}">
              <span class="logo-icon">{empresa.logo}</span>
            </div>
            <div class="empresa-info">
              <h3 class="empresa-nombre">{empresa.nombre}</h3>
              <p class="empresa-descripcion">{empresa.descripcion}</p>
            </div>
          </div>
          
          <div class="empresa-details">
            <div class="detail-item">
              <span class="detail-label">Categoría:</span>
              <span class="detail-value">{empresa.categoria}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Ubicación:</span>
              <span class="detail-value">{empresa.ubicacion}</span>
            </div>
          </div>
          
          <div class="empresa-action">
            <span class="action-text">Buscar Cuenta</span>
            <span class="action-icon">→</span>
          </div>
        </a>
      {/each}
    </div>
    
    <!-- Información adicional -->
    <section class="info-section">
      <h2>¿Cómo funciona?</h2>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-number">1</div>
          <h4>Selecciona tu empresa</h4>
          <p>Busca tu empresa en la lista de empresas disponibles</p>
        </div>
        
        <div class="step-card">
          <div class="step-number">2</div>
          <h4>Ingresa tu código</h4>
          <p>Ingresa el código de cliente que te proporcionó la empresa</p>
        </div>
        
        <div class="step-card">
          <div class="step-number">3</div>
          <h4>Revisa y paga</h4>
          <p>Revisa los detalles de tu cuenta y realiza el pago de forma segura</p>
        </div>
      </div>
    </section>
  </div>
</main>

<style>
  /* Estilos globales */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: rgb(var(--gray-900));
    background: rgb(var(--gray-50));
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space);
  }
  
  /* Header */
  .header {
    padding: var(--space-3xl) 0;
    color: rgb(var(--white));
    text-align: center;
  }
  
  .header-content {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: var(--space);
  }
  
  .subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
  }
  
  /* Contenido principal */
  .main-content {
    padding: var(--space-3xl) 0;
  }
  
  /* Grid de empresas */
  .empresas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--space-xl);
    margin-bottom: var(--space-3xl);
  }
  
  .empresa-card {
    background: rgb(var(--white));
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgb(var(--gray-200));
    text-decoration: none;
    color: inherit;
    transition: var(--transition);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .empresa-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
  }
  
  .empresa-header {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
  }
  
  .empresa-logo {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .empresa-nombre {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: var(--space-xs);
    color: rgb(var(--gray-900));
  }
  
  .empresa-descripcion {
    color: rgb(var(--gray-600));
    font-size: 0.9rem;
  }
  
  .empresa-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid rgb(var(--gray-100));
  }
  
  .detail-item:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    font-weight: 500;
    color: rgb(var(--gray-600));
    font-size: 0.9rem;
  }
  
  .detail-value {
    font-weight: 600;
    color: rgb(var(--gray-900));
    font-size: 0.9rem;
  }
  
  .empresa-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background: rgb(var(--primary) / 0.1);
    border-radius: var(--radius-lg);
    margin-top: auto;
  }
  
  .action-text {
    font-weight: 600;
    color: rgb(var(--primary));
  }
  
  .action-icon {
    font-size: 1.2rem;
    color: rgb(var(--primary));
    transition: var(--transition);
  }
  
  .empresa-card:hover .action-icon {
    transform: translateX(4px);
  }
  
  /* Sección de información */
  .info-section {
    text-align: center;
  }
  
  .info-section h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: var(--space-2xl);
    color: rgb(var(--gray-900));
  }
  
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-xl);
  }
  
  .step-card {
    background: rgb(var(--white));
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    border: 1px solid rgb(var(--gray-200));
    text-align: center;
  }
  
  .step-number {
    width: 50px;
    height: 50px;
    background: var(--gradient-primary);
    color: rgb(var(--white));
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 auto var(--space-lg);
  }
  
  .step-card h4 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .step-card p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 0 var(--space-md);
    }
    
    .title {
      font-size: 2rem;
    }
    
    .subtitle {
      font-size: 1.1rem;
    }
    
    .empresas-grid {
      grid-template-columns: 1fr;
    }
    
    .empresa-card {
      padding: var(--space-lg);
    }
    
    .empresa-header {
      flex-direction: column;
      text-align: center;
      gap: var(--space);
    }
    
    .steps-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
