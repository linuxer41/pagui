<script>
  import '../../lib/theme.css';
  
  export let data;
  
  // Usar las empresas del servidor
  const { empresas } = data;

  // Función para manejar errores de imagen
  function handleImageError(event) {
    if (event.target) {
      event.target.src = '/favicon.png';
    }
  }
</script>

<svelte:head>
  <title>Empresas - Pagui Recaudaciones</title>
  <meta name="description" content="Encuentra tu empresa y paga tu cuenta de forma segura" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<!-- Header simple -->
<div class="simple-header">
  <div class="header-content">
    <div class="header-left">
      <h1 class="page-title">Empresas Disponibles</h1>
      <p class="page-subtitle">Selecciona tu empresa para buscar y pagar tu cuenta</p>
    </div>
  </div>
</div>

<!-- Contenido principal centrado -->
<div class="main-content">
  <div class="empresas-container">
    {#if empresas.length > 0}
      <div class="empresas-grid">
        {#each empresas as empresa}
          {#if empresa}
            <a href="/recaudaciones/{empresa.id}" class="empresa-card">
              <div class="empresa-header">
                <div class="empresa-logo" style="background: {empresa.color}">
                  {#if empresa.logo && empresa.logo.includes('.png')}
                    <img 
                      src="/{empresa.logo}" 
                      alt="Logo {empresa.nombre}" 
                      class="logo-image"
                      on:error={handleImageError}
                    />
                  {:else}
                    <span class="logo-icon">{empresa.logo || '🏢'}</span>
                  {/if}
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
          {/if}
        {/each}
      </div>
    {:else}
      <div class="no-empresas">
        <div class="no-empresas-icon">🏢</div>
        <h3>No hay empresas disponibles</h3>
        <p>Por el momento no hay empresas configuradas en el sistema.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Reset y estilos base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #1a202c;
    background: #f8fafc;
  }
  
  /* Header simple */
  .simple-header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 3rem 2rem;
    text-align: center;
  }
  
  .header-content {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .page-title {
    font-size: 3rem;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 1rem;
  }
  
  .page-subtitle {
    font-size: 1.25rem;
    color: #718096;
    font-weight: 400;
  }
  
  /* Contenido principal */
  .main-content {
    padding: 3rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  /* Grid de empresas */
  .empresas-container {
    width: 100%;
  }
  
  .empresas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }
  
  .empresa-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
  
  .empresa-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e0;
  }
  
  .empresa-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .empresa-logo {
    width: 70px;
    height: 70px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
  }

  .logo-icon {
    font-size: 2rem;
  }
  
  .empresa-info {
    flex: 1;
  }
  
  .empresa-nombre {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #1a202c;
  }
  
  .empresa-descripcion {
    color: #718096;
    font-size: 1rem;
    line-height: 1.5;
  }
  
  .empresa-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f7fafc;
  }
  
  .detail-item:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    font-weight: 600;
    color: #718096;
    font-size: 0.9rem;
  }
  
  .detail-value {
    font-weight: 700;
    color: #2d3748;
    font-size: 0.9rem;
  }
  
  .empresa-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    margin-top: auto;
    color: white;
  }
  
  .action-text {
    font-weight: 700;
    font-size: 1rem;
  }
  
  .action-icon {
    font-size: 1.25rem;
    transition: transform 0.3s ease;
  }
  
  .empresa-card:hover .action-icon {
    transform: translateX(6px);
  }
  
  /* No empresas */
  .no-empresas {
    text-align: center;
    padding: 4rem 2rem;
    color: #718096;
  }
  
  .no-empresas-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
  }
  
  .no-empresas h3 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #2d3748;
  }
  
  .no-empresas p {
    font-size: 1.125rem;
    line-height: 1.6;
  }
  
  /* Responsive Design */
  @media (max-width: 1024px) {
    .empresas-grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
  }
  
  @media (max-width: 768px) {
    .simple-header {
      padding: 2rem 1.5rem;
    }
    
    .page-title {
      font-size: 2.5rem;
    }
    
    .page-subtitle {
      font-size: 1.125rem;
    }
    
    .main-content {
      padding: 2rem 1.5rem;
    }
    
    .empresas-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    
    .empresa-card {
      padding: 1.5rem;
    }
    
    .empresa-header {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }
    
    .empresa-logo {
      width: 80px;
      height: 80px;
      font-size: 2.5rem;
    }
    
    .empresa-nombre {
      font-size: 1.25rem;
    }
  }
  
  @media (max-width: 480px) {
    .simple-header {
      padding: 1.5rem 1rem;
    }
    
    .page-title {
      font-size: 2rem;
    }
    
    .page-subtitle {
      font-size: 1rem;
    }
    
    .main-content {
      padding: 1.5rem 1rem;
    }
    
    .empresa-card {
      padding: 1.25rem;
    }
    
    .empresa-logo {
      width: 60px;
      height: 60px;
      font-size: 2rem;
    }
  }
</style>