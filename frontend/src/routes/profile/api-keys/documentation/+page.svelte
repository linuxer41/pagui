<script lang="ts">
  import { goto } from '$app/navigation';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { 
    BookOpen,
    Code,
    Shield,
    Key,
    ArrowLeft,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Info,
    Server,
    FileText
  } from '@lucide/svelte';

  const publicApiUrl = import.meta.env.VITE_PUBLIC_API_URL || 'https://api.pagui.com:3001';

  const curlExample = `curl -X POST ${publicApiUrl}/qr/generate \\
  -H "X-API-Key: tu_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionId": "txn_123",
    "amount": 1000,
    "description": "Pago por servicios"
  }'`;

  const jsExample = `const response = await fetch('${publicApiUrl}/qr/generate', {
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
    '${publicApiUrl}/qr/generate',
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

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  }
</script>

<svelte:head>
  <title>Documentación API Keys | Pagui</title>
</svelte:head>

<PageLayout title="Documentación API">
  <div class="documentation-container">
    <div class="hero-section">
      <div class="hero-icon">
        <BookOpen size={48} />
      </div>
      <h1>Documentación de API Keys</h1>
      <p>
        Guía completa para integrar tu aplicación con la API Pública de Pagui usando API Keys
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
            Las API Keys permiten a aplicaciones externas consumir la API Pública de Pagui de forma segura, sin necesidad de tokens JWT. 
            La API Pública corre en un servidor independiente exclusivamente con autenticación por API Key, separada del API interna que usa JWT.
          </p>
          <div class="info-box">
            <Server size={20} />
            <div>
              <strong>API Pública:</strong> Corre en <code>{publicApiUrl}</code> con documentación Swagger autogenerada en <code>{publicApiUrl}/docs</code>
            </div>
          </div>
          <div class="info-box">
            <Info size={20} />
            <div>
              <strong>Seguridad:</strong> Las API Keys son más seguras para integraciones servidor a servidor. No expiran automáticamente y pueden revocarse en cualquier momento desde el panel de usuario.
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
                <h3>/qr/generate</h3>
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
                <code>{JSON.stringify({"transactionId": "string", "amount": "number", "description": "string", "dueDate": "ISO date", "singleUse": "boolean", "modifyAmount": "boolean"})}</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method get">GET</span>
                <h3>/qr/{'{qrId}'}/status</h3>
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
                <code>qrId: ID del código QR (path)</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method get">GET</span>
                <h3>/qr/list</h3>
              </div>
              <p>Lista todos los códigos QR con filtros opcionales.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_status</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>

                <h4>Query params (opcionales):</h4>
                <code>page, limit, status, from, to</code>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-header">
                <span class="method delete">DELETE</span>
                <h3>/qr/cancelQR</h3>
              </div>
              <p>Cancela un código QR activo.</p>
              <div class="permission-required">
                <span class="permission-badge">qr_cancel</span>
                <span class="required-text">Permiso requerido</span>
              </div>
              <div class="endpoint-details">
                <h4>Headers:</h4>
                <code>X-API-Key: tu_api_key</code>
                <code>Content-Type: application/json</code>

                <h4>Body:</h4>
                <code>{JSON.stringify({"qrId": "string"})}</code>
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
                  <button class="copy-button" onclick={() => copyToClipboard(curlExample)}>
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
                  <button class="copy-button" onclick={() => copyToClipboard(jsExample)}>
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
                  <button class="copy-button" onclick={() => copyToClipboard(pythonExample)}>
                    Copiar
                  </button>
                </div>
                <pre><code>{pythonExample}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documentación Swagger -->
      <div class="doc-section">
        <div class="section-header">
          <FileText size={24} />
          <h2>Documentación Autogenerada (Swagger)</h2>
        </div>
        <div class="section-content">
          <p>
            La API Pública incluye documentación interactiva autogenerada con Swagger/OpenAPI, 
            accesible desde el navegador:
          </p>
          <div class="info-box">
            <ExternalLink size={20} />
            <div>
              <strong>Swagger UI:</strong> <a href="{publicApiUrl}/docs" target="_blank" rel="noopener noreferrer">{publicApiUrl}/docs</a>
            </div>
          </div>
          <p>
            Desde Swagger puedes probar todos los endpoints directamente, 
            ingresando tu API Key en el botón "Authorize".
          </p>
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
                <span class="permission-name">qr_generate</span>
                <span class="permission-desc">Generar códigos QR para cobros</span>
                <span class="permission-scope">Permite crear nuevos códigos QR con montos y descripciones específicas</span>
              </div>
              <div class="permission-item">
                <span class="permission-name">qr_status</span>
                <span class="permission-desc">Consultar estado de códigos QR</span>
                <span class="permission-scope">Permite consultar el estado actual y el historial de pagos de los códigos QR</span>
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
              <p>120 requests por minuto por API Key</p>
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
        <PillButton label="Contactar Soporte" onClick={() => goto('/support')} fullWidth />
        <GhostButton><button class="ghost-btn" onclick={() => goto('/profile/api-keys')}>Gestionar API Keys</button></GhostButton>
      </div>
    </div>
  </div>
</PageLayout>

<style>
  .ghost-btn { background: none; border: none; color: var(--primary); font-size: var(--text-sm); font-weight: 600; cursor: pointer; padding: var(--space-3) var(--space-4); border-radius: var(--radius-full); }
  .ghost-btn:active { opacity: 0.7; }
  .documentation-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-4);
  }

  .hero-section {
    text-align: center;
    margin-bottom: var(--space-8);
    padding: var(--space-8) 0;
  }

  .hero-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(58, 102, 255, 0.1);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-6);
  }

  .hero-section h1 {
    font-size: clamp(2rem, 5vw, 2.5rem);
    font-weight: 700;
    margin: 0 0 var(--space-4);
    color: rgba(var(--text-primary-rgb), 1);
    line-height: 1.2;
  }

  .hero-section p {
    font-size: clamp(1rem, 3vw, 1.1rem);
    color: rgba(var(--text-secondary-rgb), 1);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .content-grid {
    display: grid;
    gap: var(--space-8);
    margin-bottom: var(--space-8);
  }

  .doc-section {
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid rgba(var(--border-rgb), 1);
  }

  .section-header h2 {
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 600;
    margin: 0;
    color: rgba(var(--text-primary-rgb), 1);
  }

  .section-content {
    color: rgba(var(--text-secondary-rgb), 1);
    line-height: 1.6;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    background: rgba(58, 102, 255, 0.05);
    border: 1px solid rgba(58, 102, 255, 0.2);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-top: var(--space-4);
  }

  .info-box strong {
    color: rgba(var(--text-primary-rgb), 1);
  }

  .info-box code {
    background: rgba(0,0,0,0.06);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85em;
  }

  .info-box a {
    color: var(--primary);
    text-decoration: underline;
  }

  .endpoints-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-6);
  }

  .endpoint-card {
    background: var(--background);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-md);
    padding: var(--space-6);
  }

  .endpoint-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    flex-wrap: wrap;
  }

  .method {
    padding: 4px 8px;
    border-radius: var(--radius-sm);
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
    color: rgba(var(--text-primary-rgb), 1);
    font-family: monospace;
    word-break: break-all;
  }

  .endpoint-card p {
    margin: 0 0 var(--space-4);
    font-size: 0.9rem;
  }

  .permission-required {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .permission-badge {
    background: var(--primary);
    color: white;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    font-family: monospace;
    white-space: nowrap;
  }

  .required-text {
    font-size: 0.8rem;
    color: rgba(var(--text-secondary-rgb), 1);
  }

  .endpoint-details h4 {
    font-size: 0.85rem;
    font-weight: 600;
    margin: var(--space-2) 0 var(--space-1);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .endpoint-details code {
    display: block;
    background: rgba(var(--surface-rgb), 1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: 0.8rem;
    margin-bottom: var(--space-1);
    border: 1px solid rgba(var(--border-rgb), 1);
    word-break: break-all;
    overflow-x: auto;
  }

  .code-examples {
    display: grid;
    gap: var(--space-6);
  }

  .code-example h3 {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    margin: 0 0 var(--space-4);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .code-block {
    background: var(--background);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    background: rgba(var(--surface-rgb), 1);
    border-bottom: 1px solid rgba(var(--border-rgb), 1);
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .code-header span {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(var(--text-secondary-rgb), 1);
    text-transform: uppercase;
  }

  .copy-button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .copy-button:hover {
    background: #CC6A00;
  }

  .code-block pre {
    margin: 0;
    padding: var(--space-4);
    overflow-x: auto;
  }

  .code-block code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: clamp(0.75rem, 2.5vw, 0.85rem);
    line-height: 1.4;
    color: rgba(var(--text-primary-rgb), 1);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .permissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
  }

  .permission-category {
    background: var(--background);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-md);
    padding: var(--space-6);
  }

  .permission-category h3 {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    margin: 0 0 var(--space-4);
    color: rgba(var(--text-primary-rgb), 1);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid rgba(var(--border-rgb), 1);
  }

  .permission-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    border-bottom: 1px solid rgba(var(--border-rgb), 1);
  }

  .permission-item:last-child {
    border-bottom: none;
  }

  .permission-name {
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--primary);
    font-weight: 600;
  }

  .permission-desc {
    font-size: 0.9rem;
    color: rgba(var(--text-primary-rgb), 1);
    font-weight: 500;
  }

  .permission-scope {
    font-size: 0.8rem;
    color: rgba(var(--text-secondary-rgb), 1);
    line-height: 1.4;
  }

  .best-practices {
    display: grid;
    gap: var(--space-6);
  }

  .practice-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .practice-item h4 {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 600;
    margin: 0 0 var(--space-1);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .practice-item p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .limits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-6);
  }

  .limit-item {
    background: var(--background);
    border: 1px solid rgba(var(--border-rgb), 1);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    text-align: center;
  }

  .limit-item h4 {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 600;
    margin: 0 0 var(--space-2);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .limit-item p {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(var(--text-secondary-rgb), 1);
  }

  .cta-section {
    text-align: center;
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    margin-top: var(--space-8);
  }

  .cta-section h2 {
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 600;
    margin: 0 0 var(--space-4);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .cta-section p {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: rgba(var(--text-secondary-rgb), 1);
    margin: 0 0 var(--space-6);
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .documentation-container {
      padding: 0 var(--space-2);
    }

    .hero-section {
      padding: var(--space-6) 0;
    }

    .hero-icon {
      width: 60px;
      height: 60px;
    }

    .doc-section {
      padding: var(--space-6);
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
      gap: var(--space-1);
    }

    .endpoint-header h3 {
      font-size: 0.875rem;
    }

    .permission-required {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
    }

    .code-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
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
      padding: var(--space-4);
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .limits-grid {
      grid-template-columns: 1fr;
    }

    .endpoint-details code {
      font-size: 0.75rem;
      padding: var(--space-1);
    }

    .code-block pre {
      padding: var(--space-2);
    }

    .code-block code {
      font-size: 0.75rem;
    }
  }
</style>
