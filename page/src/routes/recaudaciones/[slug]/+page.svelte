<script>
  import '../../../lib/theme.css';
  
  let { slug } = $props();
  let clientCode = '';
  let isLoading = false;
  let searchResult = null;
  let error = null;
  
  // Datos mockeados del backend
  const empresaData = {
    'empresa-a': {
      id: 'empresa-a',
      nombre: 'Restaurante El Buen Sabor',
      logo: '🍽️',
      descripcion: 'Restaurante de comida tradicional boliviana',
      color: 'rgb(var(--emerald))',
      gradiente: 'var(--gradient-emerald)',
      instrucciones: 'Ingresa tu código de cliente para ver tu cuenta pendiente'
    },
    'empresa-b': {
      id: 'empresa-b',
      nombre: 'Farmacia Salud Total',
      logo: '💊',
      descripcion: 'Farmacia y productos de salud',
      color: 'rgb(var(--primary))',
      gradiente: 'var(--gradient-primary)',
      instrucciones: 'Busca tu receta médica con tu código de cliente'
    },
    'empresa-c': {
      id: 'empresa-c',
      nombre: 'Taller Mecánico Rápido',
      logo: '🔧',
      descripcion: 'Servicios automotrices y mantenimiento',
      color: 'rgb(var(--accent))',
      gradiente: 'var(--gradient-accent)',
      instrucciones: 'Consulta el estado de tu vehículo con tu código'
    }
  };
  
  // Datos mockeados de clientes
  const clientesData = {
    'CLI001': {
      codigo: 'CLI001',
      nombre: 'Juan Pérez',
      empresa: 'empresa-a',
      monto: 150.50,
      descripcion: 'Cena familiar - 4 personas',
      fecha: '2024-01-15',
      estado: 'pendiente'
    },
    'CLI002': {
      codigo: 'CLI002',
      nombre: 'María González',
      empresa: 'empresa-a',
      monto: 89.75,
      descripcion: 'Almuerzo ejecutivo',
      fecha: '2024-01-14',
      estado: 'pendiente'
    },
    'MED001': {
      codigo: 'MED001',
      nombre: 'Carlos Rodríguez',
      empresa: 'empresa-b',
      monto: 245.00,
      descripcion: 'Medicamentos recetados',
      fecha: '2024-01-13',
      estado: 'pendiente'
    },
    'AUTO001': {
      codigo: 'AUTO001',
      nombre: 'Ana López',
      empresa: 'empresa-c',
      monto: 320.00,
      descripcion: 'Cambio de aceite y filtros',
      fecha: '2024-01-12',
      estado: 'pendiente'
    }
  };
  
  const empresa = empresaData[slug] || {
    id: slug,
    nombre: 'Empresa',
    logo: '🏢',
    descripcion: 'Descripción de la empresa',
    color: 'rgb(var(--gray-600))',
    gradiente: 'var(--gradient-multi)',
    instrucciones: 'Ingresa tu código de cliente'
  };
  
  async function buscarCliente() {
    if (!clientCode.trim()) {
      error = 'Por favor ingresa un código de cliente';
      return;
    }
    
    isLoading = true;
    error = null;
    searchResult = null;
    
    // Simular llamada al backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const cliente = clientesData[clientCode.toUpperCase()];
    
    if (cliente && cliente.empresa === slug) {
      searchResult = cliente;
    } else {
      error = 'Código de cliente no encontrado o no válido para esta empresa';
    }
    
    isLoading = false;
  }
  
  function limpiarBusqueda() {
    clientCode = '';
    searchResult = null;
    error = null;
  }
  
  function pagarCuenta() {
    // Aquí iría la lógica de pago
    alert('Redirigiendo al sistema de pago...');
  }
</script>

<svelte:head>
  <title>{empresa.nombre} - Pagui Recaudaciones</title>
  <meta name="description" content="Paga tu cuenta en {empresa.nombre} de forma segura y rápida" />
</svelte:head>

<!-- Header de la empresa -->
<header class="empresa-header" style="background: {empresa.gradiente}">
  <div class="container">
    <div class="empresa-info">
      <div class="empresa-logo" style="background: {empresa.color}">
        <span class="logo-icon">{empresa.logo}</span>
      </div>
      <div class="empresa-details">
        <h1 class="empresa-nombre">{empresa.nombre}</h1>
        <p class="empresa-descripcion">{empresa.descripcion}</p>
      </div>
    </div>
  </div>
</header>

<!-- Contenido principal -->
<main class="main-content">
  <div class="container">
    <!-- Formulario de búsqueda -->
    <section class="search-section">
      <div class="search-card">
        <div class="search-header">
          <h2>Buscar Cuenta</h2>
          <p class="search-instructions">{empresa.instrucciones}</p>
        </div>
        
        <form class="search-form" on:submit|preventDefault={buscarCliente}>
          <div class="input-group">
            <label for="clientCode">Código de Cliente</label>
            <input 
              type="text" 
              id="clientCode"
              bind:value={clientCode}
              placeholder="Ej: CLI001, MED001, AUTO001"
              class="search-input"
              disabled={isLoading}
            />
          </div>
          
          <button type="submit" class="btn btn-primary btn-large" disabled={isLoading}>
            {#if isLoading}
              <span class="loading-spinner"></span>
              Buscando...
            {:else}
              Buscar Cuenta
            {/if}
          </button>
        </form>
        
        {#if error}
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            {error}
          </div>
        {/if}
      </div>
    </section>
    
    <!-- Resultado de búsqueda -->
    {#if searchResult}
      <section class="result-section">
        <div class="result-card">
          <div class="result-header">
            <h3>Cuenta Encontrada</h3>
            <button class="btn btn-outline btn-sm" on:click={limpiarBusqueda}>
              Nueva Búsqueda
            </button>
          </div>
          
          <div class="cliente-info">
            <div class="cliente-details">
              <div class="info-row">
                <span class="label">Cliente:</span>
                <span class="value">{searchResult.nombre}</span>
              </div>
              <div class="info-row">
                <span class="label">Código:</span>
                <span class="value code">{searchResult.codigo}</span>
              </div>
              <div class="info-row">
                <span class="label">Descripción:</span>
                <span class="value">{searchResult.descripcion}</span>
              </div>
              <div class="info-row">
                <span class="label">Fecha:</span>
                <span class="value">{new Date(searchResult.fecha).toLocaleDateString('es-BO')}</span>
              </div>
            </div>
            
            <div class="monto-section">
              <div class="monto-label">Monto a Pagar</div>
              <div class="monto-value">Bs. {searchResult.monto.toFixed(2)}</div>
              <div class="monto-estado {searchResult.estado}">
                {searchResult.estado === 'pendiente' ? 'Pendiente de Pago' : 'Pagado'}
              </div>
            </div>
          </div>
          
          <div class="payment-actions">
            <button class="btn btn-primary btn-large" on:click={pagarCuenta}>
              Pagar Ahora
            </button>
            <button class="btn btn-outline btn-large">
              Descargar Comprobante
            </button>
          </div>
        </div>
      </section>
    {/if}
    
    <!-- Información adicional -->
    <section class="info-section">
      <div class="info-grid">
        <div class="info-card">
          <div class="info-icon">🔒</div>
          <h4>Pago Seguro</h4>
          <p>Todas las transacciones están protegidas con encriptación de nivel bancario</p>
        </div>
        
        <div class="info-card">
          <div class="info-icon">⚡</div>
          <h4>Pago Rápido</h4>
          <p>Proceso de pago simplificado que toma menos de 2 minutos</p>
        </div>
        
        <div class="info-card">
          <div class="info-icon">📱</div>
          <h4>Múltiples Opciones</h4>
          <p>Paga con QR, tarjeta de crédito, débito o transferencia bancaria</p>
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
    max-width: 800px;
    margin: 0 auto;
    padding: 0 var(--space);
  }
  
  /* Header de empresa */
  .empresa-header {
    padding: var(--space-2xl) 0;
    color: rgb(var(--white));
    text-align: center;
  }
  
  .empresa-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
  }
  
  .empresa-logo {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    box-shadow: var(--shadow-lg);
  }
  
  .empresa-nombre {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
  }
  
  .empresa-descripcion {
    font-size: 1.1rem;
    opacity: 0.9;
  }
  
  /* Contenido principal */
  .main-content {
    padding: var(--space-3xl) 0;
  }
  
  /* Sección de búsqueda */
  .search-section {
    margin-bottom: var(--space-3xl);
  }
  
  .search-card {
    background: rgb(var(--white));
    padding: var(--space-2xl);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgb(var(--gray-200));
  }
  
  .search-header {
    text-align: center;
    margin-bottom: var(--space-xl);
  }
  
  .search-header h2 {
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .search-instructions {
    color: rgb(var(--gray-600));
    font-size: 1rem;
  }
  
  .search-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .input-group label {
    font-weight: 500;
    color: rgb(var(--gray-700));
  }
  
  .search-input {
    padding: var(--space) var(--space-md);
    border: 2px solid rgb(var(--gray-300));
    border-radius: var(--radius-lg);
    font-size: 1rem;
    transition: var(--transition);
    font-family: inherit;
  }
  
  .search-input:focus {
    outline: none;
    border-color: rgb(var(--primary));
    box-shadow: 0 0 0 3px rgb(var(--primary) / 0.1);
  }
  
  .search-input:disabled {
    background: rgb(var(--gray-100));
    cursor: not-allowed;
  }
  
  /* Botones */
  .btn {
    padding: var(--space) var(--space-xl);
    border: none;
    border-radius: var(--radius-lg);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    font-family: inherit;
    font-size: 1rem;
  }
  
  .btn-primary {
    background: var(--gradient-primary);
    color: rgb(var(--white));
    box-shadow: var(--shadow-md);
  }
  
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .btn-outline {
    background: transparent;
    color: rgb(var(--primary));
    border: 2px solid rgb(var(--primary));
  }
  
  .btn-outline:hover {
    background: rgb(var(--primary));
    color: rgb(var(--white));
  }
  
  .btn-large {
    padding: var(--space-md) var(--space-2xl);
    font-size: 1.1rem;
  }
  
  .btn-sm {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.9rem;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  /* Loading spinner */
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Mensaje de error */
  .error-message {
    background: rgb(var(--error) / 0.1);
    color: rgb(var(--error));
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    border: 1px solid rgb(var(--error) / 0.2);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
  }
  
  .error-icon {
    font-size: 1.2rem;
  }
  
  /* Resultado de búsqueda */
  .result-section {
    margin-bottom: var(--space-3xl);
  }
  
  .result-card {
    background: rgb(var(--white));
    padding: var(--space-2xl);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgb(var(--gray-200));
  }
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid rgb(var(--gray-200));
  }
  
  .result-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(var(--gray-900));
  }
  
  .cliente-info {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2xl);
    margin-bottom: var(--space-xl);
  }
  
  .cliente-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) 0;
  }
  
  .label {
    font-weight: 500;
    color: rgb(var(--gray-600));
  }
  
  .value {
    font-weight: 600;
    color: rgb(var(--gray-900));
  }
  
  .value.code {
    background: rgb(var(--primary) / 0.1);
    color: rgb(var(--primary));
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius);
    font-family: 'Courier New', monospace;
  }
  
  .monto-section {
    text-align: center;
    padding: var(--space-xl);
    background: rgb(var(--gray-50));
    border-radius: var(--radius-lg);
    border: 2px solid rgb(var(--gray-200));
  }
  
  .monto-label {
    font-size: 0.9rem;
    color: rgb(var(--gray-600));
    margin-bottom: var(--space-sm);
  }
  
  .monto-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: rgb(var(--primary));
    margin-bottom: var(--space-sm);
  }
  
  .monto-estado {
    font-size: 0.9rem;
    font-weight: 600;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius);
  }
  
  .monto-estado.pendiente {
    background: rgb(var(--warning) / 0.1);
    color: rgb(var(--warning));
  }
  
  .monto-estado.pagado {
    background: rgb(var(--success) / 0.1);
    color: rgb(var(--success));
  }
  
  .payment-actions {
    display: flex;
    gap: var(--space);
    justify-content: center;
  }
  
  /* Sección de información */
  .info-section {
    margin-top: var(--space-3xl);
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-xl);
  }
  
  .info-card {
    background: rgb(var(--white));
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    border: 1px solid rgb(var(--gray-200));
    text-align: center;
  }
  
  .info-icon {
    font-size: 2.5rem;
    margin-bottom: var(--space);
  }
  
  .info-card h4 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
  }
  
  .info-card p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 0 var(--space-md);
    }
    
    .empresa-nombre {
      font-size: 1.5rem;
    }
    
    .search-card,
    .result-card {
      padding: var(--space-xl);
    }
    
    .cliente-info {
      grid-template-columns: 1fr;
      gap: var(--space-xl);
    }
    
    .payment-actions {
      flex-direction: column;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
