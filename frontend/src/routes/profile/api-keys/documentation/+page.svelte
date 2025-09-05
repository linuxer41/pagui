<script lang="ts">
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import { 
    BookOpen,
    Code,
    Shield,
    Key,
    ArrowLeft,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Info
  } from '@lucide/svelte';

  // Ejemplos de código
  const curlExample = `curl -X POST https://api.pagui.com/api/qr/generate \\
  -H "X-API-Key: tu_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionId": "txn_123",
    "amount": 1000,
    "description": "Pago por servicios"
  }'`;

  const jsExample = `const response = await fetch('https://api.pagui.com/api/qr/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'tu_api_key_aqui',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transactionId: 'txn_123',
    amount: 1000,
    description: 'Pago por servicios'
  })
});

const data = await response.json();`;

  const pythonExample = `import requests

response = requests.post(
    'https://api.pagui.com/api/qr/generate',
    headers={
        'X-API-Key': 'tu_api_key_aqui',
        'Content-Type': 'application/json'
    },
    json={
        'transactionId': 'txn_123',
        'amount': 1000,
        'description': 'Pago por servicios'
    }
)

data = response.json()`;

  // Función para copiar al portapapeles
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Aquí podrías mostrar un toast de confirmación
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  }
</script>

<svelte:head>
  <title>Documentación API Keys | Pagui</title>
</svelte:head>

<RouteLayout title="Documentación API Keys">
  <div class="documentation-container">
    <div class="hero-section">
      <div class="hero-icon">
        <BookOpen size={48} />
      </div>
      <h1>Documentación de API Keys</h1>
      <p>
        Guía completa para integrar tu aplicación con la API de Pagui usando API Keys
      </p>
    </div>

    <div class="content-grid">
      <!-- Descripción General -->
      <div class="doc-section">
        <div class="section-header">
          <Shield size={24} />
          <h2>Descripción General</h2>
        </div>
        <div class="section-content">
          <p>
            Las API Keys son una forma de autenticación alternativa a los tokens JWT que permite a las aplicaciones integrarse con la API de manera segura. 
            Cada API Key está asociada a una empresa específica y tiene permisos granulares para diferentes operaciones.
          </p>
          <div class="info-box">
            <Info size={20} />
            <div>
              <strong>Seguridad:</strong> Las API Keys son más seguras que los tokens JWT para integraciones de servidor a servidor, ya que no expiran automáticamente y pueden ser revocadas en cualquier momento.
            </div>
          </div>
        </div>
      </div>

      <!-- Endpoints Disponibles -->
      <div class="doc-section">
        <div class="section-header">
          <Code size={24} />
          <h2>Endpoints Disponibles</h2>
        </div>
        <div class="section-content">
          <div class="endpoints-grid">
            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method post">POST</span>
                <h3>/api/qr/generate</h3>
              </div>
              <p>Genera un código QR para cobro usando la API Key.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_generate</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>
                <code>Content-Type: application/json</code>
                
                <h4>Body:</h4>
                <code>{JSON.stringify({"transactionId": "string", "amount": "number", "description": "string"})}</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method get">GET</span>
                <h3>/api/qr/qrId/status</h3>
              </div>
              <p>Verifica el estado actual de un código QR.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_status</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>
                
                <h4>Parámetros:</h4>
                <code>qrId: ID del código QR</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method get">GET</span>
                <h3>/api/qr/qrId/status</h3>
              </div>
              <p>Verifica el estado actual de un código QR.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_status</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>
                
                <h4>Parámetros:</h4>
                <code>qrId: ID del código QR</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method delete">DELETE</span>
                <h3>/api/qr/qrId/cancel</h3>
              </div>
              <p>Cancela un código QR activo.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_cancel</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>
                
                <h4>Parámetros:</h4>
                <code>qrId: ID del código QR</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ejemplo de Uso -->
      <div class="doc-section">
        <div class="section-header">
          <Code size={24} />
          <h2>Ejemplo de Uso</h2>
        </div>
        <div class="section-content">
          <div class="code-examples">
            <div class="code-example">
              <h3>Generar QR con API Key</h3>
              <div class="code-block">
                <div class="code-header">
                  <span>cURL</span>
                  <button class="copy-button" on:click={() => copyToClipboard(curlExample)}>
                    Copiar
                  </button>
                </div>
                <pre><code>{curlExample}</code></pre>
              </div>
            </div>

            <div class="code-example">
              <h3>JavaScript/Node.js</h3>
              <div class="code-block">
                <div class="code-header">
                  <span>JavaScript</span>
                  <button class="copy-button" on:click={() => copyToClipboard(jsExample)}>
                    Copiar
                  </button>
                </div>
                <pre><code>{jsExample}</code></pre>
              </div>
            </div>

            <div class="code-example">
              <h3>Python</h3>
              <div class="code-block">
                <div class="code-header">
                  <span>Python</span>
                  <button class="copy-button" on:click={() => copyToClipboard(pythonExample)}>
                    Copiar
                  </button>
                </div>
                <pre><code>{pythonExample}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Permisos Disponibles -->
      <div class="doc-section">
        <div class="section-header">
          <Key size={24} />
          <h2>Permisos Disponibles</h2>
        </div>
        <div class="section-content">
          <div class="permissions-grid">
            <div class="permission-category">
              <h3>QR Codes</h3>
              <div class="permission-item">
                <span class="permission-name">create</span>
                <span class="permission-desc">Generar códigos QR para cobros</span>
                <span class="permission-scope">Permite crear nuevos códigos QR con montos y descripciones específicas</span>
              </div>
              <div class="permission-item">
                <span class="permission-name">read</span>
                <span class="permission-desc">Leer estado de códigos QR</span>
                <span class="permission-scope">Permite consultar el estado actual de los códigos QR generados</span>
              </div>
            </div>
            
            <div class="permission-category">
              <h3>QR Cancel</h3>
              <div class="permission-item">
                <span class="permission-name">qr_cancel</span>
                <span class="permission-desc">Cancelar códigos QR</span>
                <span class="permission-scope">Permite cancelar códigos QR activos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mejores Prácticas -->
      <div class="doc-section">
        <div class="section-header">
          <Shield size={24} />
          <h2>Mejores Prácticas</h2>
        </div>
        <div class="section-content">
          <div class="best-practices">
            <div class="practice-item">
              <CheckCircle size={20} />
              <div>
                <h4>Seguridad</h4>
                <p>Nunca compartas tu API Key públicamente. Guárdala en variables de entorno o archivos de configuración seguros.</p>
              </div>
            </div>
            
            <div class="practice-item">
              <CheckCircle size={20} />
              <div>
                <h4>Permisos Mínimos</h4>
                <p>Solo otorga los permisos que realmente necesitas. Esto reduce el riesgo en caso de compromiso.</p>
              </div>
            </div>
            
            <div class="practice-item">
              <CheckCircle size={20} />
              <div>
                <h4>Rotación Regular</h4>
                <p>Considera rotar tus API Keys periódicamente para mantener la seguridad.</p>
              </div>
            </div>
            
            <div class="practice-item">
              <CheckCircle size={20} />
              <div>
                <h4>Monitoreo</h4>
                <p>Revisa regularmente el uso de tus API Keys para detectar actividad sospechosa.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Límites y Restricciones -->
      <div class="doc-section">
        <div class="section-header">
          <AlertCircle size={24} />
          <h2>Límites y Restricciones</h2>
        </div>
        <div class="section-content">
          <div class="limits-grid">
            <div class="limit-item">
              <h4>Rate Limiting</h4>
              <p>1000 requests por hora por API Key</p>
            </div>
            <div class="limit-item">
              <h4>QR Codes</h4>
              <p>Máximo 1000 códigos QR activos simultáneamente</p>
            </div>
            <div class="limit-item">
              <h4>Transacciones</h4>
              <p>Consulta limitada a los últimos 12 meses</p>
            </div>
            <div class="limit-item">
              <h4>Payload</h4>
              <p>Tamaño máximo de request: 1MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="cta-section">
      <h2>¿Necesitas ayuda?</h2>
      <p>Si tienes preguntas sobre la integración o necesitas soporte técnico, no dudes en contactarnos.</p>
      <div class="cta-buttons">
        <Button variant="primary" on:click={() => goto('/support')}>
          <ExternalLink size={16} />
          Contactar Soporte
        </Button>
        <Button variant="secondary" on:click={() => goto('/profile/api-keys')}>
          <Key size={16} />
          Gestionar API Keys
        </Button>
      </div>
    </div>
  </div>
</RouteLayout>



<style>
  .documentation-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  .hero-section {
    text-align: center;
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-xl) 0;
  }

  .hero-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(58, 102, 255, 0.1);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-lg);
  }

  .hero-section h1 {
    font-size: clamp(2rem, 5vw, 2.5rem);
    font-weight: 700;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
    line-height: 1.2;
  }

  .hero-section p {
    font-size: clamp(1rem, 3vw, 1.1rem);
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .content-grid {
    display: grid;
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-xl);
  }

  .doc-section {
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }

  .section-header h2 {
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }

  .section-content {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    background: rgba(58, 102, 255, 0.05);
    border: 1px solid rgba(58, 102, 255, 0.2);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .info-box strong {
    color: var(--text-primary);
  }

  .endpoints-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-lg);
  }

  .endpoint-card {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-lg);
  }

  .endpoint-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .method {
    padding: 4px 8px;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    font-family: monospace;
    white-space: nowrap;
  }

  .method.post {
    background: #10b981;
    color: white;
  }

  .method.get {
    background: #3b82f6;
    color: white;
  }

  .method.delete {
    background: #ef4444;
    color: white;
  }

  .endpoint-header h3 {
    font-size: clamp(0.875rem, 3vw, 1rem);
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
    font-family: monospace;
    word-break: break-all;
  }

  .endpoint-card p {
    margin: 0 0 var(--spacing-md);
    font-size: 0.9rem;
  }

  .permission-required {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
  }

  .permission-badge {
    background: var(--primary-color);
    color: white;
    padding: 4px 8px;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    font-family: monospace;
    white-space: nowrap;
  }

  .required-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .endpoint-details h4 {
    font-size: 0.85rem;
    font-weight: 600;
    margin: var(--spacing-sm) 0 var(--spacing-xs);
    color: var(--text-primary);
  }

  .endpoint-details code {
    display: block;
    background: var(--surface);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-family: monospace;
    font-size: 0.8rem;
    margin-bottom: var(--spacing-xs);
    border: 1px solid var(--border-color);
    word-break: break-all;
    overflow-x: auto;
  }

  .code-examples {
    display: grid;
    gap: var(--spacing-lg);
  }

  .code-example h3 {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
  }

  .code-block {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    overflow: hidden;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--surface);
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .code-header span {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .copy-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .copy-button:hover {
    background: var(--primary-dark);
  }

  .code-block pre {
    margin: 0;
    padding: var(--spacing-md);
    overflow-x: auto;
  }

  .code-block code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: clamp(0.75rem, 2.5vw, 0.85rem);
    line-height: 1.4;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .permissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
  }

  .permission-category {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-lg);
  }

  .permission-category h3 {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
  }

  .permission-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .permission-item:last-child {
    border-bottom: none;
  }

  .permission-name {
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--primary-color);
    font-weight: 600;
  }

  .permission-desc {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .permission-scope {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .best-practices {
    display: grid;
    gap: var(--spacing-lg);
  }

  .practice-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .practice-item svg {
    color: var(--success-color, #10b981);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .practice-item h4 {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 600;
    margin: 0 0 var(--spacing-xs);
    color: var(--text-primary);
  }

  .practice-item p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .limits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--spacing-lg);
  }

  .limit-item {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-lg);
    text-align: center;
  }

  .limit-item h4 {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 600;
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
  }

  .limit-item p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .cta-section {
    text-align: center;
    background: var(--surface);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    margin-top: var(--spacing-xl);
  }

  .cta-section h2 {
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 600;
    margin: 0 0 var(--spacing-md);
    color: var(--text-primary);
  }

  .cta-section p {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-lg);
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .documentation-container {
      padding: 0 var(--spacing-sm);
    }

    .hero-section {
      padding: var(--spacing-lg) 0;
    }

    .hero-icon {
      width: 60px;
      height: 60px;
    }

    .doc-section {
      padding: var(--spacing-lg);
    }

    .endpoints-grid {
      grid-template-columns: 1fr;
    }

    .permissions-grid {
      grid-template-columns: 1fr;
    }

    .limits-grid {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .cta-buttons {
      flex-direction: column;
      align-items: center;
    }

    .endpoint-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }

    .endpoint-header h3 {
      font-size: 0.875rem;
    }

    .permission-required {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }

    .code-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
    }

    .copy-button {
      align-self: stretch;
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .hero-section h1 {
      font-size: 1.75rem;
    }

    .hero-section p {
      font-size: 1rem;
    }

    .doc-section {
      padding: var(--spacing-md);
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .limits-grid {
      grid-template-columns: 1fr;
    }

    .endpoint-details code {
      font-size: 0.75rem;
      padding: var(--spacing-xs);
    }

    .code-block pre {
      padding: var(--spacing-sm);
    }

    .code-block code {
      font-size: 0.75rem;
    }
  }
</style>
