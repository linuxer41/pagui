<script lang="ts">
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Key, Shield, Link, ExternalLink } from '@lucide/svelte';
</script>

<PageLayout title="Documentación: API Keys">
  <div class="doc">
    <section>
      <h2><Key size={18} /> ¿Qué son las API Keys?</h2>
      <p>Las API Keys son credenciales de acceso que permiten a sistemas externos comunicarse con Pagui de forma segura. Cada llave tiene permisos específicos y puede ser revocada en cualquier momento.</p>
    </section>

    <section>
      <h2><Shield size={18} /> Seguridad</h2>
      <ul>
        <li>Las llaves se muestran una sola vez al crearlas. Cópialas y guárdalas en un lugar seguro.</li>
        <li>Puedes crear múltiples llaves para diferentes entornos (desarrollo, producción).</li>
        <li>Revoca las llaves que ya no uses para mantener tu cuenta segura.</li>
      </ul>
    </section>

    <section>
      <h2><Link size={18} /> Cómo usar</h2>
      <p>Incluye tu API Key en el header <code>X-API-Key</code> de cada petición HTTP:</p>
      <pre>GET /api/v1/transactions
X-API-Key: tu_llave_aqui</pre>
    </section>

    <section>
      <h2><ExternalLink size={18} /> Endpoints disponibles (API Pública)</h2>
      <ul>
        <li><code>POST /qr/generate</code> — Generar código QR (permiso: <code>qr_generate</code>)</li>
        <li><code>GET /qr/list</code> — Listar códigos QR con filtros (permiso: <code>qr_status</code>)</li>
        <li><code>GET /qr/{'{qrId}'}</code> — Detalle de un código QR</li>
        <li><code>GET /qr/{'{qrId}'}/status</code> — Estado de un QR con pagos (permiso: <code>qr_status</code>)</li>
        <li><code>GET /qr/{'{qrId}'}/payments</code> — Pagos de un QR</li>
        <li><code>DELETE /qr/{'{qrId}'}</code> — Cancelar QR (permiso: <code>qr_cancel</code>)</li>
      </ul>
      <p class="note">La documentación interactiva (Swagger) de la API Pública está disponible en <code>{publicApiUrl}/docs</code>.</p>
    </section>
  </div>
</PageLayout>

<style>
  .doc { display: flex; flex-direction: column; gap: var(--space-6); }
  section { display: flex; flex-direction: column; gap: var(--space-2); }
  h2 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-base); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  p, li { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); line-height: 1.6; margin: 0; }
  ul { display: flex; flex-direction: column; gap: var(--space-2); padding-left: var(--space-5); margin: 0; }
  pre { background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); font-family: var(--font-mono); font-size: var(--text-xs); overflow-x: auto; color: rgba(var(--text-primary-rgb), 1); }
  code { font-family: var(--font-mono); font-size: var(--text-xs); background: rgba(var(--surface-rgb), 0.5); padding: 1px 4px; border-radius: var(--radius-sm); color: var(--primary); }
  .note { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); font-style: italic; }
</style>
